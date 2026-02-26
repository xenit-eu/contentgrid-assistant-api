
from typing import List
import uuid
from pydantic import HttpUrl
from sqlmodel import Session, select
from fastapi import HTTPException
from contentgrid_extension_helpers.dependencies.sqlalch.repositories import BaseRepository
from contentgrid_assistant_api.db.types.thread import Thread, ThreadCreate, ThreadUpdate
from contentgrid_extension_helpers.dependencies.authentication.user import ContentGridUser


class ThreadRepository(BaseRepository[Thread, ThreadCreate, ThreadUpdate]):
    """Repository for Thread operations"""
    
    def __init__(self, session: Session):
        super().__init__(session, Thread)
    
    def create(self, user: ContentGridUser, origin : HttpUrl, component : str, thread_id : uuid.UUID | None = None) -> Thread:
        """Create a new thread, associating it with the user"""
        thread_params = {
            "name" : "New Thread",
            "origin" : origin.encoded_string() if origin else "",
            "component" : component,
            "user_sub" : user.sub
        }
        
        if thread_id:
            thread_params["id"] = thread_id
            
        new_thread = Thread(
            **thread_params
        )
        self.session.add(new_thread)
        self.session.commit()
        self.session.refresh(new_thread)
        return new_thread
    
    def get_all_for_user(self, user: ContentGridUser, offset: int = 0, limit: int = 100) -> List[Thread]:
        """Get all threads for a specific user with pagination"""
        return self.session.exec(
            select(Thread).where(Thread.user_sub == user.sub).offset(offset).limit(limit)
        ).all()
        
    def get_all_for_user_and_origin(self, user: ContentGridUser, origin: HttpUrl, offset: int = 0, limit: int = 100) -> List[Thread]:
        """Get all threads for a specific user and origin"""
        return self.session.exec(
            select(Thread).where(Thread.user_sub == user.sub, Thread.origin == origin.encoded_string()).offset(offset).limit(limit)
        ).all()
    
    def get_by_id_for_user(self, thread_id: uuid.UUID, user: ContentGridUser) -> Thread:
        """Get thread by ID, ensuring it belongs to the user"""
        dataset = self.session.exec(
            select(Thread).where(Thread.id == thread_id, Thread.user_sub == user.sub)
        ).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Thread not found or access denied")
        return dataset
    
    def update_for_user(self, thread_id: uuid.UUID, update_model: ThreadUpdate, user: ContentGridUser) -> Thread:
        """Update thread, ensuring it belongs to the user"""
        thread = self.get_by_id_for_user(thread_id, user)
        
        # Apply updates
        update_data = update_model.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(thread, field, value)
        
        self.session.add(thread)
        self.session.commit()
        self.session.refresh(thread)
        return thread
    
    def delete_for_user(self, thread_id: uuid.UUID, user: ContentGridUser) -> Thread:
        """Delete thread, ensuring it belongs to the user"""
        thread = self.get_by_id_for_user(thread_id, user)
        self.session.delete(thread)
        self.session.commit()
        return thread