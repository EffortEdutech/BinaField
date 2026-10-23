package io.binafield.fieldtest;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "room_probe")
public class ProbeEntity {
    @PrimaryKey
    @NonNull
    public String id = "probe";
}
