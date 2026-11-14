use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub cors_origin: String,
    pub storage_dir: String,
    pub ai_provider: String,
    pub gemini_api_key: String,
    pub gemini_model: String,
    pub local_model_url: String,
    pub local_model_name: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .unwrap_or(8080);

        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://epub_user:epub_secret@localhost:5432/epub_db".to_string()
        });

        let cors_origin = env::var("CORS_ORIGIN")
            .unwrap_or_else(|_| "http://localhost:5173".to_string());

        let storage_dir = env::var("STORAGE_DIR")
            .unwrap_or_else(|_| "./storage".to_string());

        let ai_provider = env::var("AI_PROVIDER")
            .unwrap_or_else(|_| "gemini".to_string());

        let gemini_api_key = env::var("GEMINI_API_KEY")
            .unwrap_or_default();

        let gemini_model = env::var("GEMINI_MODEL")
            .unwrap_or_else(|_| "gemini-2.5-flash".to_string());

        let local_model_url = env::var("LOCAL_MODEL_URL")
            .unwrap_or_else(|_| "http://localhost:11434/api/generate".to_string());

        let local_model_name = env::var("LOCAL_MODEL_NAME")
            .unwrap_or_else(|_| "qwen2.5:1.5b".to_string());

        Self {
            port,
            database_url,
            cors_origin,
            storage_dir,
            ai_provider,
            gemini_api_key,
            gemini_model,
            local_model_url,
            local_model_name,
        }
    }
}

