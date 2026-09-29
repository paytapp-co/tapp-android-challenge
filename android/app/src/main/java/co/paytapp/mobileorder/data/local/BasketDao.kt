package co.paytapp.mobileorder.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface BasketDao {
    @Query("SELECT * FROM basket_lines")
    fun observeAll(): Flow<List<BasketLineEntity>>

    @Query("SELECT * FROM basket_lines WHERE itemId = :itemId")
    suspend fun find(itemId: String): BasketLineEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(line: BasketLineEntity)

    @Query("UPDATE basket_lines SET quantity = quantity + 1 WHERE itemId = :itemId")
    suspend fun increment(itemId: String)

    @Query("UPDATE basket_lines SET quantity = quantity - 1 WHERE itemId = :itemId")
    suspend fun decrement(itemId: String)

    @Query("DELETE FROM basket_lines")
    suspend fun clear()
}
