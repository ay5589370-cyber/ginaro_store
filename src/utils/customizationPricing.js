export const CUSTOM_PRINT_PRICE = 99

export function hasSideDesign(sideDesign) {
  return Boolean(
    sideDesign.template ||
      sideDesign.upload ||
      sideDesign.text.value.trim(),
  )
}

export function getCustomizationPricing(selectedVest, designState) {
  const basePrice = selectedVest?.price || 0
  const frontCustomPrint = hasSideDesign(designState.front) ? CUSTOM_PRINT_PRICE : 0
  const backCustomPrint = hasSideDesign(designState.back) ? CUSTOM_PRINT_PRICE : 0
  const premiumOptions = 0
  const customizationPrice = frontCustomPrint + backCustomPrint + premiumOptions

  return {
    basePrice,
    frontCustomPrint,
    backCustomPrint,
    premiumOptions,
    customizationPrice,
    totalPrice: basePrice + customizationPrice,
  }
}
