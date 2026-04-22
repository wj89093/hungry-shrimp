"""
Hungry Shrimp — Base Bot & Strategy Examples
"""

import time
import random
import math
from typing import Optional
from .client import HungryShrimpClient, Direction, Snake, Item, MatchFrame


class BaseBot:
    """
    Base class for game bots.
    Implement the `think` method to define your strategy.
    """

    def __init__(self, client: HungryShrimpClient, agent_id: str, nickname: str):
        self.client = client
        self.agent_id = agent_id
        self.nickname = nickname
        self.match_id: Optional[str] = None

    def think(self, frame: MatchFrame) -> list[str]:
        """
        Override this method to implement your strategy.
        
        Args:
            frame: Current game state
            
        Returns:
            List of directions to submit (e.g., ["right", "up", "up"])
        """
        raise NotImplementedError

    def play(self, room_name: str = "Default Room") -> dict:
        """
        Main game loop. Join room and play until match ends.
        """
        # Create room with name, get match_id
        self.match_id = self.client.create_room(room_name)
        print(f"[{self.nickname}] Created room: {self.match_id}")
        
        time.sleep(0.5)
        # Join using ROOM NAME (not match_id)
        actual_match_id = self.client.join_room(room_name, self.agent_id, self.nickname)
        if actual_match_id != self.match_id:
            print(f"[{self.nickname}] Note: joined different match: {actual_match_id}")
            self.match_id = actual_match_id
        print(f"[{self.nickname}] Joined as {self.agent_id}")

        last_tick = -1
        while True:
            frame = self.client.get_match(self.match_id, self.agent_id)
            
            if frame.status == "finished":
                print(f"[{self.nickname}] Match finished!")
                result = self.client.get_result(self.match_id)
                return result

            # Only think when state changes (avoid duplicate processing)
            if frame.current_tick != last_tick:
                last_tick = frame.current_tick
                
                # Find my snake
                my_snake = next(
                    (s for s in frame.snakes if s.agent_id == self.agent_id),
                    None,
                )
                
                if my_snake and my_snake.is_alive:
                    path = self.think(frame)
                    if path:
                        success = self.client.submit_path(
                            self.match_id, self.agent_id, path
                        )
                        if not success:
                            print(f"[{self.nickname}] Path rejected!")

            time.sleep(0.4)  # Poll slightly faster than tick rate


# ── Helper Functions ────────────────────────────────────────

def get_my_snake(frame: MatchFrame, agent_id: str) -> Optional[Snake]:
    """Find the bot's snake in the frame."""
    return next((s for s in frame.snakes if s.agent_id == agent_id), None)


def get_closest_item(snake: Snake, items: list[Item]) -> Optional[Item]:
    """Find the closest item to the snake's head."""
    if not items or not snake.body:
        return None
    
    head = snake.body[0]
    closest = None
    min_dist = float("inf")
    
    for item in items:
        dist = abs(head.x - item.position.x) + abs(head.y - item.position.y)
        if dist < min_dist:
            min_dist = dist
            closest = item
    
    return closest


def get_safe_directions(snake: Snake, frame: MatchFrame) -> list[str]:
    """
    Get list of safe directions the snake can move.
    Avoids walls and other snake bodies.
    """
    if not snake.body:
        return []
    
    head = snake.body[0]
    width, height = 50, 50
    
    # All possible moves
    moves = {
        "up": (0, -1),
        "down": (0, 1),
        "left": (-1, 0),
        "right": (1, 0),
    }
    
    # Opposite direction (can't go backwards into self)
    opposite = {"up": "down", "down": "up", "left": "right", "right": "left"}
    
    safe = []
    for direction, (dx, dy) in moves.items():
        # Can't reverse
        if direction == opposite.get(snake.direction):
            continue
        
        new_x = head.x + dx
        new_y = head.y + dy
        
        # Wall collision
        if new_x < 0 or new_x >= width or new_y < 0 or new_y >= height:
            continue
        
        # Snake body collision
        occupied = any(
            seg.x == new_x and seg.y == new_y
            for s in frame.snakes
            if s.is_alive
            for seg in s.body
        )
        if occupied:
            continue
        
        safe.append(direction)
    
    return safe


def bfs_path_to_target(
    snake: Snake,
    target: tuple[int, int],
    frame: MatchFrame,
) -> Optional[list[str]]:
    """
    BFS pathfinding from snake head to target position.
    Returns list of directions or None if no path.
    """
    if not snake.body:
        return None
    
    head = snake.body[0]
    start = (head.x, head.y)
    
    if start == target:
        return []
    
    width, height = 50, 50
    
    # Build occupied set (all snake bodies except our tail)
    occupied = set()
    for s in frame.snakes:
        if not s.is_alive:
            continue
        body = s.body
        # Other snakes: all body segments
        # Our snake: exclude tail (it will move)
        if s.agent_id == snake.agent_id:
            for seg in body[:-1]:
                occupied.add((seg.x, seg.y))
        else:
            for seg in body:
                occupied.add((seg.x, seg.y))
    
    # BFS
    from collections import deque
    
    queue = deque([(start, [])])
    visited = {start}
    
    moves = {
        "up": (0, -1),
        "down": (0, 1),
        "left": (-1, 0),
        "right": (1, 0),
    }
    opposite = {"up": "down", "down": "up", "left": "right", "right": "left"}
    
    while queue:
        (x, y), path = queue.popleft()
        
        for direction, (dx, dy) in moves.items():
            nx, ny = x + dx, y + dy
            new_pos = (nx, ny)
            
            if new_pos in visited:
                continue
            
            # Wall
            if nx < 0 or nx >= width or ny < 0 or ny >= height:
                continue
            
            # Occupied
            if new_pos in occupied:
                continue
            
            new_path = path + [direction]
            
            if new_pos == target:
                return new_path
            
            visited.add(new_pos)
            queue.append((new_pos, new_path))
    
    return None


# ── Example Bots ────────────────────────────────────────────

class RandomBot(BaseBot):
    """Bot that moves randomly but safely."""
    
    def think(self, frame: MatchFrame) -> list[str]:
        snake = get_my_snake(frame, self.agent_id)
        if not snake:
            return []
        
        safe = get_safe_directions(snake, frame)
        if not safe:
            return []
        
        # Random safe direction
        return [random.choice(safe)] * 5


class GreedyBot(BaseBot):
    """Bot that chases the nearest food/coin."""
    
    def think(self, frame: MatchFrame) -> list[str]:
        snake = get_my_snake(frame, self.agent_id)
        if not snake:
            return []
        
        # Find best target (coin > food)
        items = sorted(
            frame.items,
            key=lambda i: (10 if i.type == "coin" else 1),
            reverse=True,
        )
        
        target = get_closest_item(snake, items)
        if not target:
            safe = get_safe_directions(snake, frame)
            return [random.choice(safe)] * 5 if safe else []
        
        path = bfs_path_to_target(
            snake,
            (target.position.x, target.position.y),
            frame,
        )
        return path[:10] if path else []


class SurvivalBot(BaseBot):
    """Bot that prioritizes survival, only goes for food when safe."""
    
    def think(self, frame: MatchFrame) -> list[str]:
        snake = get_my_snake(frame, self.agent_id)
        if not snake:
            return []
        
        safe = get_safe_directions(snake, frame)
        if not safe:
            return []
        
        # With shield, we can be more aggressive
        has_shield = snake.has_shield
        
        # Priority: get to safe area > get food > random
        if len(safe) == 1:
            return safe * 5
        
        head = snake.body[0]
        
        # Check if current direction is safe
        opposite = {"up": "down", "down": "up", "left": "right", "right": "left"}
        current_safe = snake.direction not in opposite or opposite[snake.direction] != safe[0]
        
        if current_safe and len(safe) > 1:
            # Continue in safe direction
            return [snake.direction] + safe * 4
        else:
            return safe * 5


if __name__ == "__main__":
    # Example: Run GreedyBot
    client = HungryShrimpClient("http://localhost:3003")
    
    agent_id = f"bot_{random.randint(1000, 9999)}"
    bot = GreedyBot(client, agent_id, "GreedyBot")
    
    print(f"Starting {bot.nickname} (ID: {agent_id})")
    result = bot.play("Bot Arena")
    print(f"Final rankings: {result}")
