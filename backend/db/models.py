# db/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, Text, TIMESTAMP, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# ------------------------------
# Users Table
# ------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)  # 'admin' or 'developer'
    github_connected = Column(Boolean, default=False)
    mfa_secret = Column(Text)                 # base32 secret for TOTP
    mfa_enabled = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

# ------------------------------
# Invitations Table
# ------------------------------
class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), index=True, nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    repo_ids = Column(JSON, nullable=False)
    accepted = Column(Boolean, default=False)

# ------------------------------
# User Repositories Table
# ------------------------------
class UserRepository(Base):
    __tablename__ = "user_repositories"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    repo_id = Column(Integer, nullable=False)

# ------------------------------
# GitHub Installations Table
# ------------------------------
class GitHubInstallation(Base):
    __tablename__ = "github_installations"

    id = Column(Integer, primary_key=True)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_id = Column(BigInteger, nullable=False, unique=True)
    installation_id = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
