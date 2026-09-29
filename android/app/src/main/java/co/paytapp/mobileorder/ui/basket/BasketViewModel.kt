package co.paytapp.mobileorder.ui.basket

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.paytapp.mobileorder.data.repository.BasketRepository
import co.paytapp.mobileorder.data.repository.CheckoutRepository
import co.paytapp.mobileorder.domain.BasketLine
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class BasketViewModel @Inject constructor(
    private val basketRepository: BasketRepository,
    private val checkoutRepository: CheckoutRepository,
) : ViewModel() {

    val lines: StateFlow<List<BasketLine>> = basketRepository.lines
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    var paymentUrl by mutableStateOf<String?>(null)
        private set

    fun total(): Double = lines.value.sumOf { it.unitPrice * it.quantity }

    fun increment(itemId: String) {
        viewModelScope.launch { basketRepository.increment(itemId) }
    }

    fun decrement(itemId: String) {
        viewModelScope.launch { basketRepository.decrement(itemId) }
    }

    fun checkout() {
        viewModelScope.launch {
            val session = checkoutRepository.startPayment(total())
            paymentUrl = session.redirectUrl
        }
    }
}
