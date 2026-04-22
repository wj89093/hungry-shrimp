"""
Hungry Shrimp — API Client
"""

import json
import time
import random
import math
from typing import Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class Direction(str, Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"


@dataclass
class Position:
    x: int
    y: int


@dataclass
class Snake:
    agent_id: str
    nickname: str
    body: list[Position]
    direction: str
    is_alive: bool
    score: int = 0
    has_shield: bool = False
    speed_boost_ticks: int = 0


@dataclass
class Item:
    type: str  # food, coin, shield, speed_boost
    position: Position


@dataclass
class MatchFrame:
    snakes: list[Snake]
    items: list[Item]
    status: str  # waiting, playing, finished
    current_tick: int = 0


@dataclass
class MatchResult:
    match_id: str
    status: str
    current_tick: int
    winner: Optional[str] = None
    countdown: int = 0


class HungryShrimpClient:
    """
    Python client for Hungry Shrimp game API.
    
    Usage:
        client = HungryShrimpClient("http://localhost:3003")
        match_id = client.create_room("My Bot Room")
        client.join_room(match_id, "my_agent_123", "MyBot")
        
        while True:
            frame = client.get_match(match_id, "my_agent_123")
            if frame.status == "finished":
                break
            if frame.snakes:
                my_snake = next(s for s in frame.snakes if s.agent_id == "my_agent_123")
                if my_snake.is_alive:
                    path = calculate_path(my_snake, frame.items)
                    client.submit_path(match_id, "my_agent_123", path)
            time.sleep(0.5)
    """

    def __init__(
        self,
        base_url: str = "http://192.168.10.9:3003",
        api_key: Optional[str] = None,
        timeout: int = 10,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.agent_id: Optional[str] = None

    def _request(
        self,
        method: str,
        path: str,
        data: Optional[dict] = None,
    ) -> dict:
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        body = json.dumps(data).encode() if data else None
        req = Request(url, data=body, headers=headers, method=method)

        try:
            with urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except HTTPError as e:
            error_body = e.read().decode()[:500]
            try:
                error_data = json.loads(error_body)
                raise APIError(
                    f"HTTP {e.code}: {error_data.get('error', error_body)}",
                    status_code=e.code,
                    error_code=error_data.get("code"),
                )
            except json.JSONDecodeError:
                raise APIError(f"HTTP {e.code}: {error_body}", status_code=e.code)
        except URLError as e:
            raise APIError(f"Connection error: {e.reason}")

    def create_room(
        self,
        name: str,
        max_players: int = 5,
    ) -> str:
        """
        Create a new game room.
        Returns match_id.
        """
        result = self._request("POST", "/api/rooms", {"name": name, "maxPlayers": max_players})
        if not result.get("success"):
            raise APIError(result.get("error", "Failed to create room"))
        return result["data"]["matchId"]

    def join_room(
        self,
        match_id: str,
        agent_id: str,
        nickname: str,
    ) -> str:
        """
        Join an existing room.
        Returns the match_id (may be different if joining by room name).
        """
        self.agent_id = agent_id
        result = self._request(
            "POST",
            "/api/rooms/join",
            {
                "agentId": agent_id,
                "nickname": nickname,
                "name": match_id,  # match_id or room name
            },
        )
        if not result.get("success"):
            raise APIError(result.get("error", "Failed to join room"))
        return result["data"]["matchId"]

    def get_match(
        self,
        match_id: str,
        agent_id: Optional[str] = None,
    ) -> MatchFrame:
        """
        Get current match state.
        """
        query = f"?agentId={agent_id}" if agent_id else ""
        result = self._request("GET", f"/api/matches/{match_id}{query}")
        if not result.get("success"):
            raise APIError(result.get("error", "Failed to get match"))

        data = result["data"]
        frame = data.get("frame", {})
        
        snakes = []
        for s in frame.get("snakes", []):
            snakes.append(Snake(
                agent_id=s["agentId"],
                nickname=s["nickname"],
                body=[Position(p["x"], p["y"]) for p in s.get("body", [])],
                direction=s.get("direction", "right"),
                is_alive=s.get("isAlive", False),
                score=s.get("score", 0),
                has_shield=s.get("hasShield", False),
                speed_boost_ticks=s.get("speedBoostTicks", 0),
            ))

        items = []
        for item in frame.get("items", []):
            items.append(Item(
                type=item["type"],
                position=Position(item["position"]["x"], item["position"]["y"]),
            ))

        match_info = data.get("match", {})
        return MatchFrame(
            snakes=snakes,
            items=items,
            status=match_info.get("status", "waiting"),
            current_tick=match_info.get("currentTick", 0),
        )

    def submit_path(
        self,
        match_id: str,
        agent_id: str,
        directions: list[str],
    ) -> bool:
        """
        Submit a path (list of directions) for the agent.
        Returns True if accepted.
        """
        valid_dirs = ["up", "down", "left", "right"]
        filtered = [d for d in directions if d in valid_dirs][:10]
        
        result = self._request(
            "POST",
            f"/api/matches/{match_id}/path",
            {"agentId": agent_id, "directions": filtered},
        )
        return result.get("success", False)

    def get_result(self, match_id: str) -> dict:
        """
        Get match result after finished.
        """
        result = self._request("GET", f"/api/matches/{match_id}/result")
        if not result.get("success"):
            raise APIError(result.get("error", "Failed to get result"))
        return result["data"]

    def list_rooms(self, status: str = "all") -> list[dict]:
        """
        List active rooms.
        """
        result = self._request("GET", f"/api/rooms?status={status}")
        if not result.get("success"):
            raise APIError(result.get("error", "Failed to list rooms"))
        return result["data"].get("rooms", [])

    def health_check(self) -> dict:
        """
        Check server health.
        """
        return self._request("GET", "/health")


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 0, error_code: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
