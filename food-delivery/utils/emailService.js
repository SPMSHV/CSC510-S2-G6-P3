/**
 * Email Notification Service
 * 
 * This is a mock email service. In production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Nodemailer with SMTP
 * - Mailgun
 */

/**
 * Send order status update email
 * @param {string} to - Recipient email
 * @param {string} orderId - Order ID
 * @param {string} status - Order status
 * @param {object} orderDetails - Order details
 */
export async function sendOrderStatusEmail(to, orderId, status, orderDetails = {}) {
  // Mock implementation - logs to console
  // In production, replace with actual email service
  
  const statusMessages = {
    'placed': 'Your order has been placed!',
    'preparing': 'Your order is being prepared',
    'ready_for_pickup': 'Your order is ready for pickup',
    'out_for_delivery': 'Your order is out for delivery',
    'delivered': 'Your order has been delivered!'
  };

  const message = statusMessages[status] || 'Your order status has been updated';

  console.log(`📧 [EMAIL] To: ${to}`);
  console.log(`📧 [EMAIL] Subject: Order ${orderId} - ${message}`);
  console.log(`📧 [EMAIL] Body: Order ${orderId} status: ${status}`);
  console.log(`📧 [EMAIL] Order Total: $${orderDetails.total || 'N/A'}`);

  // In production, use actual email service:
  // await emailClient.send({
  //   to,
  //   subject: `Order ${orderId} - ${message}`,
  //   html: generateOrderEmailTemplate(orderId, status, orderDetails)
  // });

  return { success: true, message: 'Email sent (mock)' };
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(to, orderId, orderDetails) {
  console.log(`📧 [EMAIL] Order Confirmation sent to ${to} for order ${orderId}`);
  return { success: true, message: 'Confirmation email sent (mock)' };
}

/**
 * Send refund notification email
 */
export async function sendRefundNotificationEmail(to, refundId, amount, reason) {
  console.log(`📧 [EMAIL] Refund notification sent to ${to} for refund ${refundId}`);
  return { success: true, message: 'Refund notification sent (mock)' };
}

