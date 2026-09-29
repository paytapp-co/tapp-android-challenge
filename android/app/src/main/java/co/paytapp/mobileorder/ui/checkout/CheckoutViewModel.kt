package co.paytapp.mobileorder.ui.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import co.paytapp.mobileorder.data.repository.BasketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val basketRepository: BasketRepository,
) : ViewModel() {

    fun clearBasket() {
        viewModelScope.launch { basketRepository.clear() }
    }
}
