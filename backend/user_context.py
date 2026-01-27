from dataclasses import dataclass
from typing import Optional
from fastapi import Request


@dataclass
class UserContext:
    email: Optional[str] = None
    access_token: Optional[str] = None
    display_name: Optional[str] = None
    
    @property
    def is_authenticated(self) -> bool:
        return self.email is not None
    
    @property
    def user_id(self) -> str:
        if self.email:
            return self.email.lower().replace("@", "_at_").replace(".", "_")
        return "anonymous"


def get_user_context(request: Request) -> UserContext:
    email = request.headers.get("X-Forwarded-Email")
    access_token = request.headers.get("X-Forwarded-Access-Token")
    
    display_name = None
    if email:
        display_name = email.split("@")[0].replace(".", " ").title()
    
    return UserContext(
        email=email,
        access_token=access_token,
        display_name=display_name
    )


def get_dev_user_context() -> UserContext:
    return UserContext(
        email="developer@angloamerican.com",
        access_token=None,
        display_name="Developer"
    )
