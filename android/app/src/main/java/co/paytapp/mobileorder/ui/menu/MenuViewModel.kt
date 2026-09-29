package co.paytapp.mobileorder.ui.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.paytapp.mobileorder.data.repository.BasketRepository
import co.paytapp.mobileorder.data.repository.MenuRepository
import co.paytapp.mobileorder.domain.Menu
import co.paytapp.mobileorder.domain.MenuItem
import co.paytapp.mobileorder.domain.Modifier
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class MenuViewModel @Inject constructor(
    private val menuRepository: MenuRepository,
    private val basketRepository: BasketRepository,
) : ViewModel() {

    val menu = MutableStateFlow<Menu?>(null)

    val basketCount = basketRepository.lines
        .map { lines -> lines.sumOf { it.quantity } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    init {
        viewModelScope.launch {
            menu.value = menuRepository.getMenu()
        }
    }

    fun addToBasket(item: MenuItem, modifiers: List<Modifier>) {
        viewModelScope.launch {
            basketRepository.add(item, modifiers)
        }
    }
}
