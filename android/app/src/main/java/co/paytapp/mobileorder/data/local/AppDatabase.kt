package co.paytapp.mobileorder.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [BasketLineEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun basketDao(): BasketDao
}
