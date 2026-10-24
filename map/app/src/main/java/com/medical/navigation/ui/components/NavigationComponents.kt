package com.medical.navigation.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.navigation.R
import com.medical.navigation.model.ManeuverType
import com.medical.navigation.model.NavigationState
import com.medical.navigation.model.NavigationStep

/**
 * Top Navigation HUD Banner for turn-by-turn directions
 */
@Composable
fun NavigationHUD(
    state: NavigationState,
    modifier: Modifier = Modifier
) {
    if (!state.isNavigating || state.steps.isEmpty()) return

    val currentStep = state.steps.getOrNull(state.currentStepIndex)
    val nextStep = state.steps.getOrNull(state.currentStepIndex + 1)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Main maneuver card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xF00F172A), RoundedCornerShape(20.dp))
                .border(1.dp, Color(0xFF0FA397), RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Maneuver Icon
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(Color(0xFF0FA397).copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                ) {
                    val iconScale by animateFloatAsState(
                        targetValue = 1f,
                        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
                    )

                    Icon(
                        painter = painterResource(id = getManeuverIconRes(currentStep?.maneuver ?: ManeuverType.STRAIGHT)),
                        contentDescription = currentStep?.maneuver?.instruction ?: "",
                        tint = Color(0xFF0FA397),
                        modifier = Modifier
                            .size(32.dp)
                            .graphicsLayer {
                                scaleX = iconScale
                                scaleY = iconScale
                            }
                            .align(Alignment.Center)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Instruction text
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Distance to next turn
                    Text(
                        text = getDistanceText(currentStep),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )

                    // Street instruction
                    Text(
                        text = currentStep?.instruction ?: "Calculating route...",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF94A3B8)
                    )
                }
            }
        }

        // Trip summary pill
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF1E293B), RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(16.dp))
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TripSummaryItem(
                    icon = R.drawable.ic_route,
                    label = "Distance",
                    value = formatDistance(state.remainingDistanceMeters)
                )
                TripSummaryItem(
                    icon = R.drawable.ic_timer,
                    label = "Time",
                    value = formatDuration(state.remainingDurationSeconds)
                )
                TripSummaryItem(
                    icon = R.drawable.ic_traffic,
                    label = "Traffic",
                    value = "Clear"
                )
            }
        }
    }
}

@Composable
private fun TripSummaryItem(
    icon: Int,
    label: String,
    value: String
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            painter = painterResource(id = icon),
            contentDescription = null,
            tint = Color(0xFF0FA397),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF64748B)
        )
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}

/**
 * Bottom navigation controls during active navigation
 */
@Composable
fun NavigationControls(
    isMuted: Boolean,
    onEndNavigation: () -> Unit,
    onRecenter: () -> Unit,
    onToggleMute: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // End Navigation
            Button(
                onClick = onEndNavigation,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE5484D)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_close),
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp).padding(end = 8.dp)
                    )
                    Text(
                        text = "End",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }

            // Re-center
            OutlinedButton(
                onClick = onRecenter,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                border = BorderStroke(1.dp, Color(0xFF0FA397)),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = Color(0xFF0FA397)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_my_location),
                        contentDescription = null,
                        tint = Color(0xFF0FA397),
                        modifier = Modifier.size(20.dp).padding(end = 8.dp)
                    )
                    Text(
                        text = "Re-Center",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF0FA397)
                    )
                }
            }

            // Mute/Unmute
            OutlinedButton(
                onClick = onToggleMute,
                modifier = Modifier
                    .width(56.dp)
                    .height(56.dp),
                border = BorderStroke(1.dp, if (isMuted) Color(0xFFE5484D) else Color(0xFF0FA397)),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = if (isMuted) Color(0xFFE5484D) else Color(0xFF0FA397)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(
                    painter = painterResource(id = if (isMuted) R.drawable.ic_volume_off else R.drawable.ic_volume_up),
                    contentDescription = if (isMuted) "Unmute" else "Mute",
                    tint = if (isMuted) Color(0xFFE5484D) else Color(0xFF0FA397)
                )
            }
        }
    }
}

private fun getManeuverIconRes(maneuver: ManeuverType): Int = when (maneuver) {
    ManeuverType.STRAIGHT -> R.drawable.ic_arrow_upward
    ManeuverType.TURN_RIGHT -> R.drawable.ic_turn_right
    ManeuverType.TURN_LEFT -> R.drawable.ic_turn_left
    ManeuverType.SLIGHT_RIGHT -> R.drawable.ic_turn_slight_right
    ManeuverType.SLIGHT_LEFT -> R.drawable.ic_turn_slight_left
    ManeuverType.U_TURN -> R.drawable.ic_u_turn
    ManeuverType.ARRIVE -> R.drawable.ic_flag
    ManeuverType.ROUNDABOUT -> R.drawable.ic_roundabout
    ManeuverType.EXIT_ROUNDABOUT -> R.drawable.ic_exit_roundabout
}

private fun getDistanceText(step: NavigationStep?): String {
    return step?.distanceMeters?.let { meters ->
        if (meters >= 1000) {
            String.format("%.1f km", meters / 1000.0)
        } else {
            "${meters}m"
        }
    } ?: "Arrived"
}

private fun formatDistance(meters: Int): String {
    return if (meters >= 1000) {
        String.format("%.1f km", meters / 1000.0)
    } else {
        "${meters}m"
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return if (mins > 0) "${mins} min" else "${secs}s"
}