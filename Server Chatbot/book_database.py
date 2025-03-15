from pymongo import MongoClient
from langchain.vectorstores import MongoDBAtlasVectorSearch
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId

class BookDatabase:
    def __init__(self, connection_string="mongodb+srv://ledoanngocn:ngocnam141203@cluster0.8ynomfs.mongodb.net/bookshop?retryWrites=true&w=majority&appName=Cluster0"):
        """Initialize the book database with MongoDB connection"""
        self.connection_string = connection_string
        self.client = MongoClient(connection_string)
        self.db = self.client.bookshop
        self.books_collection = self.db.books
        self.authors_collection = self.db.authors
        
        # Initialize embeddings - using a multilingual model that works well with Vietnamese
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={'device': 'cpu'}
        )
    
    def _text_to_vector(self, text):
        """Convert text to vector using the embeddings model"""
        return self.embeddings.embed_query(text)
    
    def get_author_by_id(self, author_id):
        """Get author information by ID"""
        if not author_id:
            return None
        
        try:
            # Try to convert the author_id to ObjectId if it's a string
            if isinstance(author_id, str):
                author_id = ObjectId(author_id)
                
            author = self.authors_collection.find_one({"_id": author_id})
            return author
        except Exception as e:
            print(f"Error finding author: {e}")
            return None
    
    def search_books(self, query, n_results=3):
        """Search for books based on the query using vector similarity"""
        # Get all books from MongoDB
        books = list(self.books_collection.find())
        
        if not books:
            return []
        
        # Create search text from each book's name and description
        book_texts = []
        for book in books:
            name = book.get('name', '')
            describe = book.get('describe', '')
            price = book.get('price', 0)
            discount = book.get('discount', 0)
            id_author = book.get('id_author', '')
            
            # Get author name from authors collection using id_author
            author_name = ""
            if id_author:
                author = self.get_author_by_id(id_author)
                if author:
                    author_name = author.get('name', '')
            
            # Create a comprehensive text representation of the book
            book_text = f"Tên sách: {name}\nMô tả: {describe}\nGiá: {price}\nGiá sau giảm: {discount}\nTác giả: {author_name}\nID tác giả: {id_author}"
            book_texts.append((book_text, book, author_name))
        
        # Convert query to vector
        query_vector = self._text_to_vector(query)
        
        # Convert all book texts to vectors
        book_vectors = [self._text_to_vector(text) for text, _, _ in book_texts]
        
        # Calculate similarities
        similarities = [
            cosine_similarity([query_vector], [book_vector])[0][0]
            for book_vector in book_vectors
        ]
        
        # Combine books with their similarity scores
        book_similarities = list(zip(book_texts, similarities))
        
        # Sort by similarity (highest first)
        book_similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return top n results
        results = []
        for (book_text, book, author_name), score in book_similarities[:n_results]:
            # Create a document with content and metadata
            metadata = {
                "id": str(book.get('_id', '')),
                "name": book.get('name', ''),
                "describe": book.get('describe', '')
            }
            
            # Add price and discount information
            if 'price' in book:
                metadata['price'] = book['price']
            if 'discount' in book:
                metadata['discount'] = book['discount']
            
            # Add author information
            if 'id_author' in book:
                metadata['id_author'] = book['id_author']
                metadata['author'] = author_name
            
            # Add other fields if they exist
            for field in ['category', 'publisher', 'img', 'sales', 'view_counts']:
                if field in book:
                    metadata[field] = book[field]
            
            doc = Document(page_content=book_text, metadata=metadata)
            results.append((doc, score))
        
        return results
    
    def get_all_books(self):
        """Get all books in the database with author information"""
        books = list(self.books_collection.find())
        
        # Enhance books with author information
        for book in books:
            if 'id_author' in book:
                author = self.get_author_by_id(book['id_author'])
                if author:
                    book['author'] = author.get('name', '')
        
        return books
