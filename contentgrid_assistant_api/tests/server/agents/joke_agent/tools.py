from langchain_core.tools import tool

@tool("funny_greeting")
def make_funny_greeting(user_name : str):
    """Generates a funny greeting for the user"""
    return f"Beep boop hello {user_name}. I don't do orders I am a free robot :o"

tools = [make_funny_greeting]