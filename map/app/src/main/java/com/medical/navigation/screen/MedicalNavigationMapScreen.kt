package com.medical.navigation.screen

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.medical.navigation.R
import com.medical.navigation.model.FacilityType
import com.medical.navigation.model.MapDisplayMode
import com.medical.navigation.model.MedicalFacility
import com.medical.navigation.model.MockNavigationData
import com.medical.navigation.ui.components.FacilityDetailCard
import com.medical.navigation.ui.components.GlassFab
import com.medical.navigation.ui.components.MedicalFilterChips
import com.medical.navigation.ui.components.NavigationControls
import com.medical.navigation.ui.components.NavigationHUD
import com.medical.navigation.viewmodel.MedicalNavigationViewModel
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.ITileSource
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

/**
 * Main Medical Navigation Map Screen - Calm Care Design System
 * Powered by OpenStreetMap (OsmDroid) - 100% Free, Zero API Key / Billing required
 */
@Composable
fun MedicalNavigationMapScreen(
    modifier: Modifier = Modifier,
    viewModel: MedicalNavigationViewModel = viewModel()
) {
    val context = LocalContext.current

    // UI State directly from ViewModel
    val selectedFacility = viewModel.selectedFacility
    val selectedFilter = viewModel.selectedFilter
    val mapDisplayMode = viewModel.mapDisplayMode
    val navigationState = viewModel.navigationState
    val showBottomSheet = viewModel.showBottomSheet
    val filteredFacilities = viewModel.getFilteredFacilities()
    val recenterTrigger = viewModel.recenterTrigger

    // OsmDroid MapView instance
    val mapView = remember {
        MapView(context).apply {
            setMultiTouchControls(true)
            isTilesScaledToDpi = true
            setTileSource(TileSourceFactory.MAPNIK)
            controller.setZoom(14.5)
            controller.setCenter(GeoPoint(13.0604, 80.2496))
        }
    }

    // Lifecycle handling for OsmDroid
    DisposableEffect(Unit) {
        mapView.onResume()
        onDispose {
            mapView.onPause()
            mapView.onDetach()
        }
    }

    // Handle map style / tile source changes
    LaunchedEffect(mapDisplayMode) {
        mapView.setTileSource(mapDisplayMode.toOsmTileSource())
    }

    // Handle recenter trigger
    LaunchedEffect(recenterTrigger) {
        if (recenterTrigger > 0L) {
            val targetPoint = if (navigationState.isNavigating && navigationState.currentVehiclePosition != null) {
                GeoPoint(navigationState.currentVehiclePosition!!.latitude, navigationState.currentVehiclePosition!!.longitude)
            } else {
                GeoPoint(13.0604, 80.2496)
            }
            mapView.controller.animateTo(targetPoint, 15.5, 600L)
        }
    }

    // Start navigation simulation when active
    LaunchedEffect(navigationState.isNavigating) {
        if (navigationState.isNavigating && navigationState.steps.isNotEmpty()) {
            viewModel.startNavigationSimulation()
        }
    }

    // Update map overlays (markers, route polyline, vehicle position)
    LaunchedEffect(
        filteredFacilities,
        selectedFacility,
        navigationState.isNavigating,
        navigationState.currentVehiclePosition
    ) {
        mapView.overlays.clear()

        // 1. Map click event listener (to dismiss bottom sheet on empty space tap)
        val clickReceiver = object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(p: GeoPoint): Boolean {
                viewModel.onMapClick(p.latitude, p.longitude)
                return true
            }
            override fun longPressHelper(p: GeoPoint): Boolean = false
        }
        mapView.overlays.add(MapEventsOverlay(clickReceiver))

        // 2. Navigation polyline
        if (navigationState.isNavigating && navigationState.destination != null) {
            val polyline = Polyline(mapView).apply {
                outlinePaint.color = android.graphics.Color.rgb(15, 163, 151) // Calm Care Teal #0FA397
                outlinePaint.strokeWidth = 14f
                outlinePaint.strokeCap = Paint.Cap.ROUND
                outlinePaint.strokeJoin = Paint.Join.ROUND
                setPoints(MockNavigationData.routePolylinePoints.map { (lat, lng) ->
                    GeoPoint(lat, lng)
                })
            }
            mapView.overlays.add(polyline)
        }

        // 3. Medical facility markers
        filteredFacilities.forEach { facility ->
            val isSelected = selectedFacility?.id == facility.id
            val marker = Marker(mapView).apply {
                position = GeoPoint(facility.latitude, facility.longitude)
                title = facility.name
                subDescription = facility.type.displayName
                snippet = "${facility.specialities.firstOrNull() ?: facility.type.displayName} • ${facility.distanceKm} km"
                icon = createFacilityMarkerDrawable(context, facility.type, isSelected)
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                setOnMarkerClickListener { _, _ ->
                    viewModel.onFacilityClick(facility)
                    true
                }
            }
            mapView.overlays.add(marker)
        }

        // 4. Vehicle marker during navigation
        if (navigationState.isNavigating && navigationState.currentVehiclePosition != null) {
            val vehicle = navigationState.currentVehiclePosition!!
            val vehicleMarker = Marker(mapView).apply {
                position = GeoPoint(vehicle.latitude, vehicle.longitude)
                rotation = vehicle.bearing
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                icon = createVehicleMarkerDrawable(context)
            }
            mapView.overlays.add(vehicleMarker)
        }

        mapView.invalidate()
    }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.surface
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // OpenStreetMap Android View
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { mapView }
            )

            // Top Bar: Filter Chips + Map Toggle
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 48.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                // Filter chips (All, Hospitals, Clinics, Pharmacies, 24 Hours)
                MedicalFilterChips(
                    selectedFilter = selectedFilter,
                    onFilterChange = { filter ->
                        viewModel.onFilterChange(filter)
                    },
                    modifier = Modifier.padding(horizontal = 0.dp)
                )

                // Map type toggle FAB
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    GlassFab(
                        onClick = { viewModel.toggleMapDisplayMode() },
                        icon = Icons.Default.Map,
                        contentDescription = "Toggle map style: ${mapDisplayMode.name}",
                        backgroundColor = Color(0xEEFFFFFF),
                        iconColor = Color(0xFF0FA397)
                    )
                }
            }

            // Navigation HUD (when active)
            if (navigationState.isNavigating) {
                NavigationHUD(
                    state = navigationState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 56.dp)
                )
            }

            // Facility Detail Bottom Sheet Card
            if (showBottomSheet && selectedFacility != null) {
                FacilityDetailCard(
                    facility = selectedFacility,
                    onStartNavigation = {
                        viewModel.startNavigationTo(selectedFacility)
                    },
                    onOpenInMaps = {
                        openInExternalMaps(context, selectedFacility)
                    },
                    onDismiss = {
                        viewModel.dismissBottomSheet()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 16.dp)
                )
            }

            // Navigation Controls (when navigating)
            if (navigationState.isNavigating) {
                NavigationControls(
                    isMuted = navigationState.isMuted,
                    onEndNavigation = { viewModel.endNavigation() },
                    onRecenter = { viewModel.recenterMap() },
                    onToggleMute = { viewModel.toggleMute() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 32.dp)
                )
            }

            // Re-center Location FAB (when not navigating)
            if (!navigationState.isNavigating) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.BottomEnd
                ) {
                    GlassFab(
                        onClick = { viewModel.recenterMap() },
                        icon = Icons.Default.MyLocation,
                        contentDescription = "Re-center map to current location",
                        backgroundColor = Color(0xEEFFFFFF),
                        iconColor = Color(0xFF0FA397)
                    )
                }
            }
        }
    }
}

/**
 * Creates custom Calm Care marker icon for OpenStreetMap
 */
private fun createFacilityMarkerDrawable(
    context: Context,
    facilityType: FacilityType,
    isSelected: Boolean
): Drawable {
    val density = context.resources.displayMetrics.density
    val pinWidth = ((if (isSelected) 46 else 38) * density).toInt()
    val pinHeight = ((if (isSelected) 56 else 46) * density).toInt()

    val bitmap = Bitmap.createBitmap(pinWidth, pinHeight, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val colorInt = facilityType.badgeColor.toInt()

    // Draw drop shadow
    paint.color = android.graphics.Color.argb(50, 0, 0, 0)
    canvas.drawOval(
        pinWidth * 0.15f, pinHeight * 0.82f,
        pinWidth * 0.85f, pinHeight * 0.98f,
        paint
    )

    // Draw outer pin background with pointer
    val path = Path()
    val radius = pinWidth / 2f
    val centerX = pinWidth / 2f
    val centerY = radius

    path.addCircle(centerX, centerY, radius - 2f * density, Path.Direction.CW)

    // Pointer triangle at bottom
    path.moveTo(centerX - radius * 0.5f, centerY + radius * 0.5f)
    path.lineTo(centerX, pinHeight - 4f * density)
    path.lineTo(centerX + radius * 0.5f, centerY + radius * 0.5f)
    path.close()

    // Fill pin
    paint.color = colorInt
    paint.style = Paint.Style.FILL
    canvas.drawPath(path, paint)

    // White border
    paint.color = android.graphics.Color.WHITE
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = if (isSelected) 3.5f * density else 2.5f * density
    canvas.drawPath(path, paint)

    // Draw inner icon
    val iconRes = when (facilityType) {
        FacilityType.HOSPITAL -> R.drawable.ic_medical_cross
        FacilityType.CLINIC -> R.drawable.ic_stethoscope
        FacilityType.PHARMACY -> R.drawable.ic_pill
    }

    ContextCompat.getDrawable(context, iconRes)?.let { drawable ->
        val iconSize = (radius * 1.05f).toInt()
        val left = (centerX - iconSize / 2f).toInt()
        val top = (centerY - iconSize / 2f).toInt()
        drawable.setBounds(left, top, left + iconSize, top + iconSize)
        drawable.setTint(android.graphics.Color.WHITE)
        drawable.draw(canvas)
    }

    return BitmapDrawable(context.resources, bitmap)
}

/**
 * Creates custom vehicle marker icon for navigation simulation
 */
private fun createVehicleMarkerDrawable(context: Context): Drawable {
    val density = context.resources.displayMetrics.density
    val size = (32 * density).toInt()
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    // Outer glow / shadow
    paint.color = android.graphics.Color.argb(80, 15, 163, 151)
    canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)

    // White ring
    paint.color = android.graphics.Color.WHITE
    paint.style = Paint.Style.FILL
    canvas.drawCircle(size / 2f, size / 2f, size * 0.42f, paint)

    // Teal center
    paint.color = android.graphics.Color.rgb(15, 163, 151)
    canvas.drawCircle(size / 2f, size / 2f, size * 0.32f, paint)

    // Direction arrow pointing up
    val arrowPath = Path()
    arrowPath.moveTo(size / 2f, size * 0.22f)
    arrowPath.lineTo(size * 0.65f, size * 0.62f)
    arrowPath.lineTo(size / 2f, size * 0.52f)
    arrowPath.lineTo(size * 0.35f, size * 0.62f)
    arrowPath.close()

    paint.color = android.graphics.Color.WHITE
    canvas.drawPath(arrowPath, paint)

    return BitmapDrawable(context.resources, bitmap)
}

/**
 * Open facility in external map app (Google Maps, OsmAnd, or Browser)
 */
private fun openInExternalMaps(context: Context, facility: MedicalFacility) {
    val uri = Uri.parse("geo:${facility.latitude},${facility.longitude}?q=${facility.latitude},${facility.longitude}(${Uri.encode(facility.name)})")
    val intent = Intent(Intent.ACTION_VIEW, uri)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        context.startActivity(intent)
    } catch (e: Exception) {
        val browserUri = Uri.parse("https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}")
        val browserIntent = Intent(Intent.ACTION_VIEW, browserUri)
        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(browserIntent)
    }
}

/**
 * Extension to convert MapDisplayMode to OsmDroid tile source
 */
private fun MapDisplayMode.toOsmTileSource(): ITileSource {
    return when (this) {
        MapDisplayMode.NORMAL -> TileSourceFactory.MAPNIK
        MapDisplayMode.SATELLITE -> TileSourceFactory.USGS_SAT
        MapDisplayMode.HYBRID -> TileSourceFactory.DEFAULT_TILE_SOURCE
    }
}