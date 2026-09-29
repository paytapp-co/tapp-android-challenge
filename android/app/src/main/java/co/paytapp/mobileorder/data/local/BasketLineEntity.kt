package co.paytapp.mobileorder.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "basket_lines")
data class BasketLineEntity(
    @PrimaryKey val itemId: String,
    val name: String,
    val modifierIds: String,
    val modifierNames: String,
    val unitPrice: Double,
    val quantity: Int,
)
