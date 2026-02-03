"""
Memory Module - Persistent memory infrastructure for multi-session AI systems

Provides:
- MEMORY.md: Curated long-term facts and preferences
- Daily logs: Session-based logs with key events
- SQLite DB: Structured memory entries with semantic search
- Tools: memory_read, memory_write, semantic_search, hybrid_search

Usage:
    from tools.memory import load_all_memory
    context = load_all_memory()
    
    import tools.memory.memory_write as mw
    mw.write_entry(content="Important fact", entry_type="fact", importance=8)
"""

__all__ = [
    'load_all_memory',
    'write_memory',
    'search_memory',
]
