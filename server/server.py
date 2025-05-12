from datetime import datetime
from unittest import result
from fastapi import FastAPI, Request
from pydantic import BaseModel
import requests as req
import numpy as np
import faiss
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Content(BaseModel):
    id: str
    index: int
    text: str


class Chunk(BaseModel):
    title: str
    content: List[Content]


class EmbedRequest(BaseModel):
    url: str
    timestamp: datetime
    chunks: Chunk


class SearchQuery(BaseModel):
    query: str


def embedTextToVec(text: str):
    try:
        res = req.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
        )
        res.raise_for_status()
        data = res.json()

        if "embedding" not in data:
            raise ValueError("No embedding in response")
        return np.array(data["embedding"], dtype="float32")
    except Exception as e:
        print(f"Error in embedTextToVec: {str(e)}")
        raise e


os.makedirs("storage", exist_ok=True)

index_file = "storage/index.faiss"
metadata_file = "storage/metadata.json"

# print(os.path.exists(index_file))
# print(os.path.exists(metadata_file))

# build index
if os.path.exists(index_file):
    index = faiss.read_index(index_file)
else:
    dimention = len(embedTextToVec("test"))
    index = faiss.IndexFlatL2(dimention)

if os.path.exists(metadata_file):
    with open(metadata_file, "r") as f:
        metadata_store = json.load(f)
else:
    metadata_store = []


@app.post("/embed")
async def embeding(data: EmbedRequest):
    try:
        url = data.url
        title = data.chunks.title
        chunks = data.chunks.content
        print("Received:", url, title)
        # print(data)

        if not chunks:
            raise ValueError("Received empty chunks")

        added_count = 0

        for chunk in chunks:
            emb = embedTextToVec(chunk.text)
            if emb is None:
                print(f"Skipping chunk due to embedding failure: {chunk}")
                continue

            emb = np.array([emb], dtype=np.float32)
            print(f"Adding embedding with shape: {emb.shape}, count : {added_count}")
            index.add(emb)
            metadata_store.append(
                {
                    "id": chunk.id,
                    "index": chunk.index,
                    "title": title,
                    "url": url,
                    "text": chunk.text,
                }
            )
            added_count += 1

        faiss.write_index(index, index_file)
        with open(metadata_file, "w") as f:
            json.dump(metadata_store, f, indent=2)

        return {"status": "success", "added": added_count}

    except Exception as e:
        print("🔥 Error in /embed:", str(e))
        return {"error": str(e)}


@app.post("/search")
async def searchQuery(user_query: SearchQuery):
    try:
        query_embed = embedTextToVec(user_query.query)

        if index.ntotal == 0:
            return {"results": [], "note": "No documents in index yet"}

        D, I = index.search(np.array([query_embed], dtype=np.float32), k=3)

        results = []
        for i in I[0]:
            if i < len(metadata_store):
                results.append(
                    {
                        "url": metadata_store[i]["url"],
                        "id": metadata_store[i]["id"],
                        "text": metadata_store[i]["text"],
                        "title": metadata_store[i]["title"],
                    }
                )

        # print(results)
        return {"results": results}

    except Exception as e:
        print(e)
        return {"error": str(e)}
