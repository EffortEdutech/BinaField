package io.binafield.fieldtest;

import static org.junit.Assert.*;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteException;

import androidx.room.Room;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class BinaFieldRoomInstrumentationTest {
    private static final String DB = "bf_phase1_gate.db";
    private Context context;
    private BinaFieldRoomDb room;
    private SupportSQLiteDatabase db;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        context.deleteDatabase(DB);
        reopen();
    }

    @After
    public void tearDown() {
        if (room != null) room.close();
        context.deleteDatabase(DB);
    }

    private void reopen() {
        if (room != null) room.close();
        room = BinaFieldRoomDb.open(context, DB);
        db = room.getOpenHelper().getWritableDatabase();
    }

    private long scalarLong(String sql, Object... args) {
        try (Cursor c = db.query(sql, args)) {
            assertTrue(c.moveToFirst());
            return c.getLong(0);
        }
    }

    private String scalarString(String sql, Object... args) {
        try (Cursor c = db.query(sql, args)) {
            assertTrue(c.moveToFirst());
            return c.getString(0);
        }
    }

    @Test
    public void freshRoomDatabaseExecutesCanonicalSchema() {
        assertEquals(1, scalarLong("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='submission_attempt'"));
        assertEquals(1, scalarLong("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='local_evidence'"));
        assertEquals(1, scalarLong("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='trg_submission_attempt_immutable'"));
        assertEquals(1, scalarLong("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='trg_evidence_identity_after_upload'"));
    }

    @Test
    public void autosaveAndOriginalEvidenceSurviveRoomReopen() {
        db.execSQL("INSERT INTO submission_session(organization_id,session_id,assignment_id,assignment_revision_started,template_version_id,lifecycle_state,payload_json,validation_json,last_local_save_at,owning_device_id) VALUES(?,?,?,?,?,'IN_PROGRESS',?,'{}',?,?)",
                new Object[]{"org-a","sess-1","asg-1",1,"tv-1","{\"yield\":0,\"irrigated\":false}","2026-10-22T01:00:00Z","dev-1"});
        db.execSQL("INSERT INTO local_evidence(organization_id,attachment_id,assignment_id,session_id,field_id,evidence_type,evidence_role,local_file_path,source_kind,byte_size,sha256,device_captured_at,lifecycle_state,created_by_device_id) VALUES(?,?,?,?,?,'PHOTO','ORIGINAL',?,'CAMERA_CAPTURE',?,?,?,'LOCAL_CAPTURED',?)",
                new Object[]{"org-a","att-1","asg-1","sess-1","photo-1","/private/att-1.jpg",128,"abc123","2026-10-22T01:00:00Z","dev-1"});
        reopen();
        assertEquals("{\"yield\":0,\"irrigated\":false}", scalarString("SELECT payload_json FROM submission_session WHERE organization_id=? AND session_id=?", "org-a", "sess-1"));
        assertEquals("ORIGINAL", scalarString("SELECT evidence_role FROM local_evidence WHERE organization_id=? AND attachment_id=?", "org-a", "att-1"));
    }

    @Test
    public void submittedAttemptIsImmutableOnAndroidSQLite() {
        db.execSQL("INSERT INTO submission_attempt(organization_id,attempt_id,idempotency_key,session_id,assignment_id,assignment_revision_used,template_version_id,blueprint_hash,canonical_payload_json,payload_hash,evidence_manifest_json,device_id,contract_version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                new Object[]{"org-a","attempt-1","idem-1","sess-1","asg-1",1,"tv-1","bp-hash","{\"a\":1}","payload-hash","[]","dev-1","1.0","2026-10-22T01:00:00Z"});
        try {
            db.execSQL("UPDATE submission_attempt SET canonical_payload_json='{\"a\":2}' WHERE organization_id='org-a' AND attempt_id='attempt-1'");
            fail("Expected immutable-attempt trigger");
        } catch (SQLiteException expected) {
            assertTrue(expected.getMessage().contains("SUBMISSION_ATTEMPT_IMMUTABLE"));
        }
    }

    @Test
    public void evidenceDependencyAndReconciliationPersistAcrossReopen() {
        db.execSQL("INSERT INTO sync_outbox(organization_id,operation_id,operation_type,entity_type,entity_id,priority,state,created_at,updated_at) VALUES('org-a','op-e','EVIDENCE_UPLOAD_FINALIZE','ATTACHMENT','att-1',0,'QUEUED','2026-10-22T01:00:00Z','2026-10-22T01:00:00Z')");
        db.execSQL("INSERT INTO sync_outbox(organization_id,operation_id,operation_type,entity_type,entity_id,priority,state,created_at,updated_at) VALUES('org-a','op-s','SUBMISSION_ATTEMPT_SEND','ATTEMPT','attempt-1',1,'BLOCKED_DEPENDENCY','2026-10-22T01:00:00Z','2026-10-22T01:00:00Z')");
        db.execSQL("INSERT INTO sync_operation_dependency(organization_id,operation_id,depends_on_operation_id,required) VALUES('org-a','op-s','op-e',1)");
        db.execSQL("INSERT INTO reconciliation_case(organization_id,case_id,device_id,entity_type,entity_id,conflict_type,created_at,severity,allowed_actions_json,status) VALUES('org-a','case-1','dev-1','ASSIGNMENT','asg-1','ASSIGNMENT_CANCELLED','2026-10-22T01:00:00Z','BLOCKING','[\"ACKNOWLEDGE_SERVER_STATE\"]','OPEN')");
        reopen();
        assertEquals(1, scalarLong("SELECT COUNT(*) FROM sync_operation_dependency WHERE organization_id='org-a' AND operation_id='op-s' AND depends_on_operation_id='op-e'"));
        assertEquals("OPEN", scalarString("SELECT status FROM reconciliation_case WHERE organization_id='org-a' AND case_id='case-1'"));
    }

    @Test
    public void cursorApplyBeforeAdvanceIsTransactional() {
        db.execSQL("INSERT INTO sync_cursor(organization_id,device_id,current_cursor,updated_at) VALUES('org-a','dev-1','c1','2026-10-22T01:00:00Z')");
        db.beginTransaction();
        try {
            db.execSQL("UPDATE sync_cursor SET current_cursor='c2', updated_at='2026-10-22T01:01:00Z' WHERE organization_id='org-a' AND device_id='dev-1'");
            // Simulate crash/failure before durable inbox application completes: no setTransactionSuccessful().
        } finally {
            db.endTransaction();
        }
        assertEquals("c1", scalarString("SELECT current_cursor FROM sync_cursor WHERE organization_id='org-a' AND device_id='dev-1'"));
    }

    @Test
    public void uploadedOriginalEvidenceIdentityCannotMutate() {
        db.execSQL("INSERT INTO local_evidence(organization_id,attachment_id,assignment_id,session_id,field_id,evidence_type,evidence_role,local_file_path,source_kind,byte_size,sha256,device_captured_at,lifecycle_state,created_by_device_id) VALUES('org-a','att-2','asg-1','sess-1','photo-1','PHOTO','ORIGINAL','/private/original.jpg','CAMERA_CAPTURE',128,'hash-a','2026-10-22T01:00:00Z','UPLOADED','dev-1')");
        try {
            db.execSQL("UPDATE local_evidence SET sha256='hash-b' WHERE organization_id='org-a' AND attachment_id='att-2'");
            fail("Expected evidence identity trigger");
        } catch (SQLiteException expected) {
            assertTrue(expected.getMessage().contains("EVIDENCE_IDENTITY_IMMUTABLE"));
        }
    }
}
