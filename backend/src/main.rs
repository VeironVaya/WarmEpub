mod config;
mod controllers;
mod dtos;
mod error;
mod models;
mod repositories;
mod services;

use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post, put},
    Router,
};
use config::Config;
use controllers::{
    book_controller, bookmark_controller, dictionary_controller, reader_controller,
    vocabulary_controller, AppState,
};
use repositories::{
    BookmarkRepository, BookRepository, ProgressRepository, VocabularyRepository,
    WordCacheRepository,
};
use services::{
    ai::create_ai_provider, BookService, DictionaryService, ReaderService,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "epub_backend=debug,tower_http=debug,axum=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();
    tracing::info!("Starting EPUB Reader backend on port {}", config.port);

    // 2. Connect to PostgreSQL
    tracing::info!("Connecting to database: {}", &config.database_url);
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to PostgreSQL: {e}");
            e
        })?;

    // 3. Run database migrations automatically
    tracing::info!("Running database migrations...");
    match sqlx::migrate!("./migrations").run(&pool).await {
        Ok(_) => tracing::info!("Database migrations applied successfully."),
        Err(sqlx::migrate::MigrateError::VersionMismatch(v)) => {
            tracing::warn!(
                "Migration checksum warning for version {v} (safe CRLF/LF line-ending divergence). Continuing since schema is already applied."
            );
        }
        Err(e) => {
            tracing::error!("Migration error: {e}");
            return Err(e.into());
        }
    }

    // 4. Instantiate Repositories
    let book_repo = BookRepository::new(pool.clone());
    let progress_repo = ProgressRepository::new(pool.clone());
    let word_cache_repo = WordCacheRepository::new(pool.clone());
    let vocabulary_repo = VocabularyRepository::new(pool.clone());
    let bookmark_repo = BookmarkRepository::new(pool.clone());

    // 5. Instantiate Pluggable AI Engine & Services
    let ai_provider = create_ai_provider(&config);
    let book_service = BookService::new(book_repo.clone(), &config.storage_dir);
    let reader_service = ReaderService::new(book_repo.clone(), progress_repo.clone());
    let dictionary_service = DictionaryService::new(word_cache_repo.clone(), ai_provider);

    let state = AppState {
        book_service,
        reader_service,
        dictionary_service,
        vocabulary_repo,
        bookmark_repo,
    };

    // 6. Setup CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 7. Setup Axum routes
    let app = Router::new()
        // Book routes
        .route("/api/books", post(book_controller::upload_book))
        .route("/api/books", get(book_controller::list_books))
        .route("/api/books/:id", get(book_controller::get_book_detail))
        .route("/api/books/:id/cover", get(book_controller::get_book_cover))
        .route("/api/books/:id", delete(book_controller::delete_book))
        // Reader & progress routes
        .route(
            "/api/books/:id/chapters/:index",
            get(reader_controller::get_chapter),
        )
        .route(
            "/api/books/:id/progress",
            put(reader_controller::update_progress),
        )
        // Bookmark routes
        .route(
            "/api/books/:id/bookmarks",
            post(bookmark_controller::create_bookmark),
        )
        .route(
            "/api/books/:id/bookmarks",
            get(bookmark_controller::list_bookmarks),
        )
        .route(
            "/api/books/:id/bookmarks/:bookmark_id",
            delete(bookmark_controller::delete_bookmark),
        )
        // Dictionary & AI translation routes
        .route(
            "/api/dictionary/translate",
            post(dictionary_controller::translate_word),
        )
        .route(
            "/api/dictionary/explain",
            post(dictionary_controller::explain_word),
        )
        // Vocabulary routes
        .route(
            "/api/vocabulary",
            post(vocabulary_controller::save_vocabulary),
        )
        .route(
            "/api/vocabulary",
            get(vocabulary_controller::list_vocabulary),
        )
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // 8. Bind listener
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

