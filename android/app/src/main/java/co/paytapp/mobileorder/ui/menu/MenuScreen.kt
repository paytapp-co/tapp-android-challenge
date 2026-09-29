package co.paytapp.mobileorder.ui.menu

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import co.paytapp.mobileorder.domain.MenuItem
import co.paytapp.mobileorder.domain.formatPrice
import co.paytapp.mobileorder.domain.Modifier as ItemModifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(
    onOpenBasket: () -> Unit,
    viewModel: MenuViewModel = hiltViewModel(),
) {
    val menu by viewModel.menu.collectAsState()
    val basketCount by viewModel.basketCount.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tapp Mobile Order") },
                actions = {
                    TextButton(onClick = onOpenBasket) {
                        BadgedBox(badge = { if (basketCount > 0) Badge { Text("$basketCount") } }) {
                            Text("Basket")
                        }
                    }
                },
            )
        },
    ) { padding ->
        val current = menu
        if (current == null) {
            Column(Modifier.fillMaxSize().padding(padding), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Text(current.venue.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(current.venue.location, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            current.items.groupBy { it.category }.forEach { (category, items) ->
                item {
                    Text(category, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 16.dp))
                }
                items(items) { item ->
                    MenuItemCard(item = item, onAdd = { modifiers -> viewModel.addToBasket(item, modifiers) })
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MenuItemCard(item: MenuItem, onAdd: (List<ItemModifier>) -> Unit) {
    val selected = remember { mutableStateListOf<ItemModifier>() }

    Card(modifier = Modifier.fillMaxWidth().alpha(if (item.available) 1f else 0.5f)) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(item.name, style = MaterialTheme.typography.titleMedium)
                    Text(formatPrice(item.price), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Button(
                    enabled = item.available,
                    onClick = {
                        onAdd(selected.toList())
                        selected.clear()
                    },
                ) {
                    Text(if (item.available) "Add" else "Sold out")
                }
            }
            if (item.available && item.modifiers.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    item.modifiers.forEach { modifier ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = modifier in selected,
                                onCheckedChange = { checked -> if (checked) selected.add(modifier) else selected.remove(modifier) },
                            )
                            Text("${modifier.name} (+${formatPrice(modifier.price)})")
                        }
                    }
                }
            }
        }
    }
}
