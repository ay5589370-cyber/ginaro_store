const stages = ['Order Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered']

function OrderTimeline({ currentStage }) {
  const currentIndex = Math.max(0, stages.indexOf(currentStage))

  return (
    <div className="order-timeline" aria-label="Order tracking">
      {stages.map((stage, index) => (
        <div className={index <= currentIndex ? 'is-active' : ''} key={stage}>
          <span />
          <strong>{stage}</strong>
        </div>
      ))}
    </div>
  )
}

export default OrderTimeline
