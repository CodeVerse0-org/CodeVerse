# db/models.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    JSON,
    Text,
    TIMESTAMP,
    BigInteger,
)
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# --------------------------------------------------
# USERS
# --------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)   # admin / developer
    github_connected = Column(Boolean, default=False)
    mfa_secret = Column(Text)
    mfa_enabled = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


# --------------------------------------------------
# INVITATIONS
# --------------------------------------------------
class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), index=True, nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    repo_ids = Column(JSON, nullable=False)
    accepted = Column(Boolean, default=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)


# --------------------------------------------------
# USER ↔ REPOSITORY MAPPING
# --------------------------------------------------
class UserRepository(Base):
    __tablename__ = "user_repositories"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    repo_id = Column(BigInteger, nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)


# --------------------------------------------------
# GITHUB INSTALLATIONS
# --------------------------------------------------
class GitHubInstallation(Base):
    __tablename__ = "github_installations"

    id = Column(Integer, primary_key=True)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    org_id = Column(BigInteger, nullable=False)  # Note: Removed unique=True constraint
    installation_id = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


# --------------------------------------------------
# REPOSITORIES
# --------------------------------------------------
class Repository(Base):
    __tablename__ = "repositories"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255))
    html_url = Column(Text)
    private = Column(Boolean, default=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)


# --------------------------------------------------
# NOTIFICATIONS
# --------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    repo_id = Column(BigInteger, ForeignKey("repositories.id"), nullable=False)
    title = Column(String)
    message = Column(Text)
    event_type = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    

# --------------------------------------------------
# AUDIT LOGS
# --------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    repository_id = Column(BigInteger, nullable=True)
    repository_name = Column(String(255), nullable=True)
    details = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())