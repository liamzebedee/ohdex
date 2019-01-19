const Container = ({ children }) => {
    return <div>
        <style jsx>{`
            div {
                padding: 1rem 2rem;
            }
        `}</style>
        {children}
    </div>
}

export {
    Container
}