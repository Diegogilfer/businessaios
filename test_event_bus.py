from services.events.event_bus import event_bus
from services.events.event_types import EventType
from services.events.subscribers import log_event

event_bus.subscribe(
    EventType.TASK_STARTED,
    log_event
)

event_bus.publish(
    EventType.TASK_STARTED,
    {
        "task_id": "123"
    }
)