export const PAYMENT_PRODUCT_ID = 'payment_link'
export const PAYMENT_PRODUCT_NAME = 'Payment'

export function isPaymentOrder(productId?: string | null) {
    return productId === PAYMENT_PRODUCT_ID
}
