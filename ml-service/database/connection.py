import os
from typing import Dict, Any
import chromadb
from pymongo import MongoClient

# Database configuration from environment variables (Docker or local)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sonic_fingerprints")

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))


def get_mongo_client() -> MongoClient:
    """Return a PyMongo client connection."""
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)


def get_chroma_client():
    """Return a ChromaDB client connection, attempting HTTP server first and falling back to PersistentClient."""
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        client.heartbeat()
        return client
    except Exception:
        # Fallback to persistent disk storage when HTTP server is not running
        workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", os.path.join(workspace_dir, "chroma_data"))
        os.makedirs(persist_dir, exist_ok=True)
        return chromadb.PersistentClient(path=persist_dir)


def get_rooms_collection():
    """Retrieve or initialize the 'rooms' ChromaDB collection with cosine distance metric."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="rooms",
        metadata={"hnsw:space": "cosine"}
    )


def get_space_collection():
    """Retrieve or initialize the 'space_sounds' ChromaDB collection with cosine distance metric."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="space_sounds",
        metadata={"hnsw:space": "cosine"}
    )


def get_space_clips_collection():
    """Retrieve or initialize the 'space_clips' ChromaDB collection with cosine distance metric."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="space_clips",
        metadata={"hnsw:space": "cosine"}
    )


def init_chroma_collections():
    """Initialize required collections on service startup if ChromaDB is available."""
    try:
        col_rooms = get_rooms_collection()
        print(f"[ChromaDB] Collection 'rooms' ready (count: {col_rooms.count()})")
        col_clips = get_space_clips_collection()
        print(f"[ChromaDB] Collection 'space_clips' ready (count: {col_clips.count()})")
        return True
    except Exception as e:
        print(f"[ChromaDB] Startup warning: Could not initialize ChromaDB collections: {e}")
        return False



def check_mongodb() -> Dict[str, Any]:
    """Test connection to MongoDB instance."""
    try:
        client = get_mongo_client()
        server_info = client.server_info()
        return {
            "status": "connected",
            "version": server_info.get("version", "unknown"),
            "uri": MONGO_URI
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "uri": MONGO_URI
        }


def check_chromadb() -> Dict[str, Any]:
    """Test connection to ChromaDB instance."""
    try:
        client = get_chroma_client()
        heartbeat = client.heartbeat()
        return {
            "status": "connected",
            "heartbeat": heartbeat,
            "host": CHROMA_HOST,
            "port": CHROMA_PORT
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "host": CHROMA_HOST,
            "port": CHROMA_PORT
        }


def get_database_status() -> Dict[str, Any]:
    """Return status of all backing vector and document databases."""
    return {
        "mongodb": check_mongodb(),
        "chromadb": check_chromadb()
    }
