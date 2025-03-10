from datetime import timedelta


class Config():
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = None
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = None


class LocalDevelopementConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///maindb.sqlite3"
    DEBUG = True
    JWT_SECRET_KEY = 'hellothisismysecretkey'
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES= timedelta(hours=1)
    UPLOAD_FOLDER = 'uploads'