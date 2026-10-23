package io.binafield.fieldtest;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.sqlite.db.SupportSQLiteDatabase;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@Database(entities = {ProbeEntity.class}, version = 1, exportSchema = false)
public abstract class BinaFieldRoomDb extends RoomDatabase {
    public static BinaFieldRoomDb open(Context context, String name) {
        Context app = context.getApplicationContext();
        return Room.databaseBuilder(app, BinaFieldRoomDb.class, name)
                .allowMainThreadQueries()
                .addCallback(new Callback() {
                    @Override
                    public void onCreate(@NonNull SupportSQLiteDatabase db) {
                        super.onCreate(db);
                        applyCanonicalSchema(app, db);
                    }
                })
                .build();
    }

    private static void applyCanonicalSchema(Context context, SupportSQLiteDatabase db) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                context.getAssets().open("0001_local_schema_v1.sql"), StandardCharsets.UTF_8))) {
            StringBuilder statement = new StringBuilder();
            boolean trigger = false;
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;
                if (statement.length() == 0 && trimmed.startsWith("CREATE TRIGGER")) trigger = true;
                statement.append(line).append('\n');
                if ((!trigger && trimmed.endsWith(";")) || (trigger && trimmed.equals("BEGIN SELECT RAISE(ABORT,'SUBMISSION_ATTEMPT_IMMUTABLE'); END;")) ||
                        (trigger && trimmed.equals("BEGIN SELECT RAISE(ABORT,'SUBMITTED_SESSION_IMMUTABLE'); END;")) ||
                        (trigger && trimmed.equals("BEGIN SELECT RAISE(ABORT,'EVIDENCE_IDENTITY_IMMUTABLE'); END;"))) {
                    db.execSQL(statement.toString());
                    statement.setLength(0);
                    trigger = false;
                }
            }
            if (statement.length() > 0) db.execSQL(statement.toString());
        } catch (Exception e) {
            throw new IllegalStateException("BF_LOCAL_SCHEMA_APPLY_FAILED", e);
        }
    }
}
