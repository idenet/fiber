import React, { render, Component } from './react'

const root = document.getElementById('root')

// const jsx = (
//   <div>
//     <p>Hello React</p>
//     <p>Hi Fiber</p>
//   </div>
// )

// render(jsx, root)

// setTimeout(() => {
//   const jsx = (
//     <div>
//       <div>奥利给</div>
//     </div>
//   )
//   render(jsx, root)
// }, 2000)

class Greating extends Component {
  constructor(props) {
    super(props)
    this.state = {
      name: '张三',
    }
  }

  render() {
    return (
      <div>
        {this.props.title} {this.state.name}
        <button onClick={() => this.setState({ name: '李四' })}></button>
      </div>
    )
  }
}

render(<Greating title="哦里给"></Greating>, root)

// function fnComponent(props) {
//   return <div>{props.title}</div>
// }

// render(<fnComponent title="hello"></fnComponent>, root)
