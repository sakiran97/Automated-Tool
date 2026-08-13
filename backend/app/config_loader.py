import json
import logging
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Target
from app.scheduler import add_target_job

logger = logging.getLogger(__name__)


async def seed_targets_from_config(db: AsyncSession) -> int:
    """Load targets from config/targets.json and insert any missing ones into DB."""
    config_path = Path(settings.CONFIG_PATH)
    if not config_path.exists():
        logger.warning(f"[CONFIG] Config file not found at {config_path}")
        return 0

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        targets_data = data.get("targets", [])
        added_count = 0

        for t_dict in targets_data:
            url = t_dict.get("url")
            if not url:
                continue

            # Check if target already exists
            result = await db.execute(select(Target).where(Target.url == url))
            existing = result.scalar_one_or_none()

            if not existing:
                new_target = Target(
                    name=t_dict.get("name", url),
                    url=url,
                    platform=t_dict.get("platform", "Custom"),
                    scope_details=t_dict.get("scope_details"),
                    scan_mode=t_dict.get("scan_mode", "auto"),
                    scan_interval_minutes=t_dict.get("scan_interval_minutes", 180),
                    custom_headers=t_dict.get("custom_headers"),
                    is_active=t_dict.get("is_active", True),
                )
                db.add(new_target)
                await db.commit()
                await db.refresh(new_target)

                if new_target.scan_mode == "auto" and new_target.is_active and new_target.scan_interval_minutes:
                    add_target_job(new_target.id, new_target.scan_interval_minutes)

                added_count += 1
                logger.info(f"[CONFIG] Imported target from config: {new_target.name} ({new_target.url})")

        return added_count

    except Exception as e:
        logger.error(f"[CONFIG] Failed to load targets from config: {e}")
        return 0


async def export_targets_to_config(db: AsyncSession) -> bool:
    """Export current targets from DB to config/targets.json."""
    try:
        result = await db.execute(select(Target))
        targets = result.scalars().all()

        config_data = {
            "targets": [
                {
                    "name": t.name,
                    "url": t.url,
                    "platform": t.platform,
                    "scope_details": t.scope_details,
                    "scan_mode": t.scan_mode,
                    "scan_interval_minutes": t.scan_interval_minutes,
                    "custom_headers": t.custom_headers,
                    "is_active": t.is_active,
                }
                for t in targets
            ]
        }

        config_path = Path(settings.CONFIG_PATH)
        config_path.parent.mkdir(parents=True, exist_ok=True)

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        return True
    except Exception as e:
        logger.error(f"[CONFIG] Failed to export targets to config: {e}")
        return False
