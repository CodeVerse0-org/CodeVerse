from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Invitation(Base):
    __tablename__ = "invitations"
    id = Column(Integer, primary_key=True)
    email = Column(String, index=True)
    token = Column(String, unique=True)
    repo_ids = Column(JSON)
    accepted = Column(Boolean, default=False)

class UserRepository(Base):
    __tablename__ = "user_repositories"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    repo_id = Column(Integer)
