package co.paytapp.mobileorder.data.repository

import co.paytapp.mobileorder.data.remote.MerchantApi
import co.paytapp.mobileorder.domain.Menu
import co.paytapp.mobileorder.domain.MenuItem
import co.paytapp.mobileorder.domain.Modifier
import co.paytapp.mobileorder.domain.Venue
import javax.inject.Inject

class MenuRepository @Inject constructor(
    private val api: MerchantApi,
) {
    suspend fun getMenu(): Menu {
        val response = api.getMenu()
        return Menu(
            venue = Venue(response.venue.name, response.venue.location, response.venue.currency),
            items = response.items.map { item ->
                MenuItem(
                    id = item.id,
                    name = item.name,
                    category = item.category,
                    price = item.price / 100.0,
                    available = item.available,
                    modifiers = item.modifiers.map { Modifier(it.id, it.name, it.price / 100.0) },
                )
            },
        )
    }
}
