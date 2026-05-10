from supabase import create_client, Client
from app.core.config import get_settings
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncio
from functools import wraps

settings = get_settings()

def async_supabase(func):
    """Decorator to run sync supabase operations in async context"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)
    return wrapper

class SupabaseClient:
    def __init__(self):
        self.enabled = all([
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
            settings.SUPABASE_SERVICE_KEY
        ])
        
        if self.enabled:
            self.client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            self.admin_client: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
        else:
            self.client = None
            self.admin_client = None
            print("⚠️  Supabase credentials not found - running in development mode without database")
    
    @async_supabase
    def _create_session_sync(self, user_id: Optional[str], ip_address: Optional[str], user_agent: Optional[str]):
        """Create analysis session (sync)"""
        data = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": "processing"
        }
        
        result = self.client.table("analysis_sessions").insert(data).execute()
        return result.data[0]
    
    async def create_session(
        self, 
        user_id: Optional[str] = None, 
        ip_address: Optional[str] = None, 
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new analysis session"""
        if not self.enabled:
            return {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "status": "processing",
                "created_at": datetime.utcnow().isoformat()
            }
        return await self._create_session_sync(user_id, ip_address, user_agent)
    
    @async_supabase
    def _update_session_sync(self, session_id: str, data: Dict[str, Any]):
        """Update session status (sync)"""
        result = self.client.table("analysis_sessions")\
            .update(data)\
            .eq("id", session_id)\
            .execute()
        return result.data[0] if result.data else None
    
    async def update_session_status(
        self, 
        session_id: str, 
        status: str, 
        processing_time_ms: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update session status"""
        if not self.enabled:
            return {
                "id": session_id,
                "status": status,
                "processing_time_ms": processing_time_ms,
                "error_message": error_message,
                "updated_at": datetime.utcnow().isoformat()
            }
        
        data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if processing_time_ms is not None:
            data["processing_time_ms"] = processing_time_ms
        if error_message is not None:
            data["error_message"] = error_message
            
        return await self._update_session_sync(session_id, data)
    
    @async_supabase
    def _save_analysis_result_sync(self, session_id: str, analysis_data: Dict[str, Any]):
        """Save analysis results to database (sync)"""
        data = {
            "session_id": session_id,
            "filename": analysis_data.get("filename"),
            "file_size": analysis_data.get("file_size"),
            "mime_type": analysis_data.get("mime_type"),
            "image_width": analysis_data.get("image_info", {}).get("dimensions", {}).get("width"),
            "image_height": analysis_data.get("image_info", {}).get("dimensions", {}).get("height"),
            "bald_regions": analysis_data.get("detection", {}).get("regions_detected", {}).get("bald", 0),
            "hair_regions": analysis_data.get("detection", {}).get("regions_detected", {}).get("hair", 0),
            "baldness_ratio": analysis_data.get("measurements", {}).get("percentage", {}).get("baldness_ratio"),
            "hair_coverage": analysis_data.get("measurements", {}).get("percentage", {}).get("hair_coverage"),
            "bald_area_cm2": analysis_data.get("measurements", {}).get("cm2", {}).get("bald"),
            "hair_area_cm2": analysis_data.get("measurements", {}).get("cm2", {}).get("hair"),
            "total_area_cm2": analysis_data.get("measurements", {}).get("cm2", {}).get("total_head"),
            "severity": analysis_data.get("classification", {}).get("severity"),
            "norwood_scale": analysis_data.get("classification", {}).get("norwood_scale"),
            "original_image_path": analysis_data.get("original_image_path"),
            "annotated_image_path": analysis_data.get("annotated_image_path"),
            "metadata": json.dumps(analysis_data.get("metadata", {}))
        }
        
        result = self.client.table("analysis_results").insert(data).execute()
        return result.data[0]
    
    async def save_analysis_result(self, session_id: str, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save analysis results to database"""
        if not self.enabled:
            return {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat(),
                **analysis_data
            }
        return await self._save_analysis_result_sync(session_id, analysis_data)
    
    @async_supabase
    def _upload_file_sync(self, file_bytes: bytes, file_path: str, bucket: str, content_type: str):
        """Upload file to Supabase Storage (sync)"""
        result = self.admin_client.storage.from_(bucket).upload(
            file_path,
            file_bytes,
            {"content-type": content_type}
        )
        
        # Get public URL
        url = self.admin_client.storage.from_(bucket).get_public_url(file_path)
        return url
    
    async def upload_file(
        self, 
        file_bytes: bytes, 
        file_path: str, 
        bucket: str = "uploads",
        content_type: str = "image/jpeg"
    ) -> str:
        """Upload file to Supabase Storage"""
        if not self.enabled:
            # Return a mock URL for development
            return f"/dev/{bucket}/{file_path}"
        return await self._upload_file_sync(file_bytes, file_path, bucket, content_type)
    
    @async_supabase
    def _get_analysis_result_sync(self, session_id: str):
        """Get analysis result by session ID (sync)"""
        result = self.client.table("analysis_results")\
            .select("*, analysis_sessions(*)")\
            .eq("session_id", session_id)\
            .single()\
            .execute()
        
        return result.data if result.data else None
    
    async def get_analysis_result(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis result by session ID"""
        if not self.enabled:
            return None
        return await self._get_analysis_result_sync(session_id)
    
    @async_supabase
    def _get_user_history_sync(self, user_id: str, limit: int):
        """Get user's analysis history (sync)"""
        result = self.client.table("analysis_results")\
            .select("*, analysis_sessions!inner(*)")\
            .eq("analysis_sessions.user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return result.data
    
    async def get_user_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's analysis history"""
        if not self.enabled:
            return []  # Return empty list in development mode
        return await self._get_user_history_sync(user_id, limit)
    
    @async_supabase
    def _cleanup_old_files_sync(self):
        """Cleanup old files based on expiry (sync)"""
        expiry_date = datetime.utcnow() - timedelta(hours=settings.FILE_EXPIRY_HOURS)
        
        # Get expired sessions
        result = self.client.table("analysis_sessions")\
            .select("id")\
            .lt("created_at", expiry_date.isoformat())\
            .execute()
        
        expired_sessions = [session["id"] for session in result.data]
        
        # Delete files from storage and database records
        # This would need additional implementation based on your cleanup strategy
        
        return len(expired_sessions)
    
    async def cleanup_old_files(self) -> int:
        """Cleanup old files and sessions"""
        if not self.enabled:
            return 0  # No cleanup needed in development mode
        return await self._cleanup_old_files_sync()

# Global instance
supabase_client = SupabaseClient()

def get_supabase_client() -> SupabaseClient:
    """Get the global Supabase client instance"""
    return supabase_client