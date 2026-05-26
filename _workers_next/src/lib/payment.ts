export const PAYMENT_PRODUCT_ID = 'payment_link'
export const PAYMENT_PRODUCT_NAME = 'Payment'
export const POINTS_TOPUP_PRODUCT_ID = 'points_topup'
export const POINTS_TOPUP_PRODUCT_NAME = 'Points Top-up'

export function isPaymentOrder(productId?: string | null) {
    return productId === PAYMENT_PRODUCT_ID
}

export function isPointsTopupOrder(productId?: string | null) {
    return productId === POINTS_TOPUP_PRODUCT_ID
}
