"""reset state to the seed persona. use the reset endpoint instead when the server is running."""
from store import Store

Store().reset()
print("state restored to the seed persona")
