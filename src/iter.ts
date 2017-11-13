import { $$asyncIterator } from 'iterall'

export const withStaticFields = (asyncIterator: AsyncIterator<any>, staticFields: Object): Function => {
  return (rootValue: any, args: any, context: any, info: any): AsyncIterator<any> => {

    return {
      next() {
        return asyncIterator.next().then(({ value, done }) => {
          return {
            value: {
              ...value,
              ...staticFields,
            },
            done,
          }
        })
      },
      return() {
        return Promise.resolve({ value: undefined, done: true })
      },
      throw(error) {
        return Promise.reject(error)
      },
      [$$asyncIterator]() {
        return this
      },
    }
  }
}
