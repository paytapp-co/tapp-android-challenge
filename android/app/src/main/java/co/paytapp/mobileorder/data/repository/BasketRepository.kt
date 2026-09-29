package co.paytapp.mobileorder.data.repository

import co.paytapp.mobileorder.data.local.BasketDao
import co.paytapp.mobileorder.data.local.BasketLineEntity
import co.paytapp.mobileorder.domain.BasketLine
import co.paytapp.mobileorder.domain.MenuItem
import co.paytapp.mobileorder.domain.Modifier
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class BasketRepository @Inject constructor(
    private val dao: BasketDao,
) {
    val lines: Flow<List<BasketLine>> = dao.observeAll().map { entities ->
        entities.map { entity ->
            BasketLine(
                itemId = entity.itemId,
                name = entity.name,
                modifierNames = entity.modifierNames.split(",").filter { it.isNotBlank() },
                unitPrice = entity.unitPrice,
                quantity = entity.quantity,
            )
        }
    }

    suspend fun add(item: MenuItem, modifiers: List<Modifier>) {
        val existing = dao.find(item.id)
        if (existing != null) {
            dao.upsert(existing.copy(quantity = existing.quantity + 1))
        } else {
            dao.upsert(
                BasketLineEntity(
                    itemId = item.id,
                    name = item.name,
                    modifierIds = modifiers.joinToString(",") { it.id },
                    modifierNames = modifiers.joinToString(",") { it.name },
                    unitPrice = item.price + modifiers.sumOf { it.price },
                    quantity = 1,
                )
            )
        }
    }

    suspend fun increment(itemId: String) = dao.increment(itemId)

    suspend fun decrement(itemId: String) = dao.decrement(itemId)

    suspend fun clear() = dao.clear()
}
