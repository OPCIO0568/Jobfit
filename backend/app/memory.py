from collections import defaultdict
from copy import deepcopy
from typing import Any


class InMemorySessionStore:
    def __init__(self, max_turns: int = 12) -> None:
        self.max_turns = max_turns
        self._sessions: dict[str, list[dict[str, str]]] = defaultdict(list)
        # MVP memory is process-local only. It is cleared when the server restarts.
        self._states: dict[str, dict[str, Any]] = {}

    def get(self, session_id: str) -> list[dict[str, str]]:
        return list(self._sessions[session_id])

    def append(self, session_id: str, role: str, content: str) -> None:
        turns = self._sessions[session_id]
        turns.append({"role": role, "content": content})
        if len(turns) > self.max_turns:
            del turns[: len(turns) - self.max_turns]

    def get_state(self, session_id: str) -> dict[str, Any]:
        return deepcopy(self._states.get(session_id, {}))

    def save_state(self, session_id: str, state: dict[str, Any]) -> None:
        self._states[session_id] = deepcopy(state)


session_store = InMemorySessionStore()
