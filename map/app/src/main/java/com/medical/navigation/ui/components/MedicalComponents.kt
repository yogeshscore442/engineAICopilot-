package com.medical.navigation.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.navigation.R
import com.medical.navigation.model.FacilityType
import com.medical.navigation.model.MedicalFacility
import com.medical.navigation.model.MedicalFilter

/**
 * Glassmorphic card background modifier
 */
fun Modifier.glassCard(
    elevation: Dp = 4.dp,
    cornerRadius: Dp = 24.dp
) = this
    .background(Color(0xEEFFFFFF), RoundedCornerShape(cornerRadius))
    .border(1.dp, Color(0x66E2E8F0), RoundedCornerShape(cornerRadius))
    .clip(RoundedCornerShape(cornerRadius))

/**
 * Glassmorphic FAB button supporting both ImageVector and Painter
 */
@Composable
fun GlassFab(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    icon: Any,
    contentDescription: String,
    backgroundColor: Color = Color(0xEEFFFFFF),
    iconColor: Color = Color(0xFF0FA397)
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.92f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
    )

    Box(
        modifier = modifier
            .size(56.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clip(RoundedCornerShape(28.dp))
            .background(backgroundColor)
            .border(1.dp, Color(0x66E2E8F0), RoundedCornerShape(28.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {
                    isPressed = true
                    onClick()
                    isPressed = false
                }
            )
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        when (icon) {
            is ImageVector -> {
                Icon(
                    imageVector = icon,
                    contentDescription = contentDescription,
                    tint = iconColor
                )
            }
            is Painter -> {
                Icon(
                    painter = icon,
                    contentDescription = contentDescription,
                    tint = iconColor
                )
            }
        }
    }
}

/**
 * Medical filter chip row - horizontal scrollable
 */
@Composable
fun MedicalFilterChips(
    selectedFilter: MedicalFilter,
    onFilterChange: (MedicalFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    val filters = MedicalFilter.values()

    LazyRow(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(0.dp)
    ) {
        items(filters) { filter ->
            val isSelected = selectedFilter == filter
            FilterChip(
                selected = isSelected,
                onClick = { onFilterChange(filter) },
                label = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            painter = painterResource(id = getFilterIconRes(filter.icon)),
                            contentDescription = null,
                            tint = if (isSelected) Color.White else Color(0xFF0FA397),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = filter.label,
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp,
                            color = if (isSelected) Color.White else Color(0xFF0FA397)
                        )
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF0FA397),
                    selectedLabelColor = Color.White,
                    containerColor = Color(0xEEFFFFFF),
                    labelColor = Color(0xFF0FA397)
                ),
                shape = RoundedCornerShape(50.dp),
                modifier = Modifier.height(36.dp)
            )
        }
    }
}

private fun getFilterIconRes(iconName: String): Int = when (iconName) {
    "medical_services" -> R.drawable.ic_medical_services
    "emergency" -> R.drawable.ic_emergency
    "local_hospital" -> R.drawable.ic_hospital
    "pharmacy" -> R.drawable.ic_pharmacy
    else -> R.drawable.ic_medical_services
}

/**
 * Custom map marker for medical facilities
 */
@Composable
fun MedicalMarker(
    facilityType: FacilityType,
    isSelected: Boolean = false,
    modifier: Modifier = Modifier
) {
    val (badgeColor, iconRes) = when (facilityType) {
        FacilityType.HOSPITAL -> Color(0xFFE5484D) to R.drawable.ic_medical_cross
        FacilityType.CLINIC -> Color(0xFF0FA397) to R.drawable.ic_stethoscope
        FacilityType.PHARMACY -> Color(0xFF22A06B) to R.drawable.ic_pill
    }

    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1.2f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .size(40.dp)
    ) {
        // Main badge circle
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(badgeColor, RoundedCornerShape(20.dp))
                .border(3.dp, Color.White, RoundedCornerShape(20.dp))
                .clip(RoundedCornerShape(20.dp))
        ) {
            Icon(
                painter = painterResource(id = iconRes),
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier
                    .size(20.dp)
                    .align(Alignment.Center)
            )
        }

        // 24/7 badge for hospitals
        if (facilityType == FacilityType.HOSPITAL) {
            Box(
                modifier = Modifier
                    .size(18.dp)
                    .background(Color(0xFF22A06B), RoundedCornerShape(9.dp))
                    .border(2.dp, Color.White, RoundedCornerShape(9.dp))
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 2.dp, end = 2.dp)
            ) {
                Text(
                    text = "24/7",
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxSize().padding(top = 1.dp)
                )
            }
        }

        // Selection ring
        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .border(2.dp, Color(0xFF0FA397), RoundedCornerShape(24.dp))
                    .align(Alignment.Center)
            )
        }
    }
}

/**
 * Facility detail bottom sheet card
 */
@Composable
fun FacilityDetailCard(
    facility: MedicalFacility,
    onStartNavigation: () -> Unit,
    onOpenInMaps: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassCard(cornerRadius = 24.dp)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Handle bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .background(Color(0xFFE2E8F0), RoundedCornerShape(2.dp))
        )

        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = facility.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0F172A),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Category badge
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                            .background(getTypeColor(facility.type), RoundedCornerShape(12.dp))
                    ) {
                        Text(
                            text = facility.type.displayName,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }

                    // 24/7 indicator
                    if (facility.isOpen24Hours) {
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                .background(Color(0xFF22A06B), RoundedCornerShape(12.dp))
                        ) {
                            Text(
                                text = "24/7",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // Dismiss button
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.padding(-8.dp)
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_close),
                    contentDescription = "Dismiss",
                    tint = Color(0xFF475569)
                )
            }
        }

        // Address & Distance
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_location_on),
                        contentDescription = null,
                        tint = Color(0xFF64748B),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = facility.address,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF475569),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${facility.distanceKm} km",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0FA397)
                )
                Text(
                    text = "${facility.etaMinutes} min drive",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF64748B)
                )
            }
        }

        // ICU Beds & Emergency info
        if (facility.type == FacilityType.HOSPITAL) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // ICU Beds
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(12.dp)
                        .background(Color(0xFFDCFCE7), RoundedCornerShape(12.dp))
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF22A06B), RoundedCornerShape(4.dp))
                        )
                        Column {
                            Text(
                                text = "ICU Beds Available",
                                fontSize = 11.sp,
                                color = Color(0xFF166534)
                            )
                            Text(
                                text = "${facility.icuBedsAvailable} Beds",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF166534)
                            )
                        }
                    }
                }

                // Emergency Services
                if (facility.hasEmergencyServices) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(12.dp)
                            .background(Color(0xFFFFF1F2), RoundedCornerShape(12.dp))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                painter = painterResource(id = R.drawable.ic_emergency),
                                contentDescription = null,
                                tint = Color(0xFFE5484D),
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Text(
                                    text = "Emergency Services",
                                    fontSize = 11.sp,
                                    color = Color(0xFF991B1B)
                                )
                                Text(
                                    text = "24/7 Trauma Center",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF991B1B)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Critical meds for pharmacy
        if (facility.type == FacilityType.PHARMACY && facility.criticalMedsInStock) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
                    .background(Color(0xFFE0F2FE), RoundedCornerShape(12.dp))
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_medication),
                        contentDescription = null,
                        tint = Color(0xFF0369A1),
                        modifier = Modifier.size(20.dp)
                    )
                    Column {
                        Text(
                            text = "Critical Medications",
                            fontSize = 11.sp,
                            color = Color(0xFF0369A1)
                        )
                        Text(
                            text = "In Stock - Ready for Pickup",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0369A1)
                        )
                    }
                }
            }
        }

        // Phone number
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_phone),
                contentDescription = null,
                tint = Color(0xFF0FA397),
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = facility.phoneNumber,
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF0F172A)
            )
            Spacer(modifier = Modifier.weight(1f))
            IconButton(
                onClick = {}
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_call),
                    contentDescription = "Call",
                    tint = Color(0xFF0FA397)
                )
            }
        }

        // Action Buttons
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Primary: Start Emergency Route
            Button(
                onClick = onStartNavigation,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE5484D)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_navigation),
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp).padding(end = 8.dp)
                    )
                    Text(
                        text = "Start Emergency Route",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }

            // Secondary: Open in External Maps
            OutlinedButton(
                onClick = onOpenInMaps,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, Color(0xFF0FA397)),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color(0xFF0FA397)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_google_maps),
                        contentDescription = null,
                        tint = Color(0xFF0FA397),
                        modifier = Modifier.size(20.dp).padding(end = 8.dp)
                    )
                    Text(
                        text = "Open in Maps App",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF0FA397)
                    )
                }
            }
        }
    }
}

private fun getTypeColor(type: FacilityType): Color = when (type) {
    FacilityType.HOSPITAL -> Color(0xFFE5484D)
    FacilityType.CLINIC -> Color(0xFF0FA397)
    FacilityType.PHARMACY -> Color(0xFF22A06B)
}