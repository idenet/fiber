import React, { render, Component } from './react'

const root = document.getElementById('root')

const jsx = (
  <div>
    <p>Hello React</p>
    <p>Hi Fiber</p>
  </div>
)

// render(jsx, root)

class Greating extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return <div>hahaha</div>
  }
}

// render(<Greating></Greating>, root)

function fnComponent() {
  return <div>fnComponent</div>
}

render(<fnComponent></fnComponent>, root)
