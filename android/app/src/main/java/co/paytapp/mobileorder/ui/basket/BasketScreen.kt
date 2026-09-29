package co.paytapp.mobileorder.ui.basket

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import co.paytapp.mobileorder.domain.formatPrice

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BasketScreen(
    onBack: () -> Unit,
    onPay: (String) -> Unit,
    viewModel: BasketViewModel = hiltViewModel(),
) {
    val lines by viewModel.lines.collectAsState()

    LaunchedEffect(viewModel.paymentUrl) {
        viewModel.paymentUrl?.let(onPay)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Your basket") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        if (lines.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(padding), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Your basket is empty.")
            }
            return@Scaffold
        }

        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(lines, key = { it.itemId }) { line ->
                    Card(Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(line.name, style = MaterialTheme.typography.titleMedium)
                                if (line.modifierNames.isNotEmpty()) {
                                    Text(line.modifierNames.joinToString(", "), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(formatPrice(line.unitPrice * line.quantity), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            OutlinedButton(onClick = { viewModel.decrement(line.itemId) }) { Text("−") }
                            Text("${line.quantity}", modifier = Modifier.padding(horizontal = 12.dp))
                            OutlinedButton(onClick = { viewModel.increment(line.itemId) }) { Text("+") }
                        }
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 16.dp)) {
                Text("Total", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Text(formatPrice(viewModel.total()), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            Button(onClick = { viewModel.checkout() }, modifier = Modifier.fillMaxWidth()) {
                Text("Pay ${formatPrice(viewModel.total())}")
            }
        }
    }
}
