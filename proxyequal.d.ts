declare module 'proxyequal' {

    interface ProxyStateResult<T> {
        state: T,
        affected: string[],
        reset: () => void,

        replaceState(state: T): ProxyStateResult<T>
    };

    /**
     * Wraps state with traps
     * @param {T} state - the "state" object
     * @return {{state: T; affected: string[]}}
     */
    export function proxyState<T>(state: T): ProxyStateResult<T>;

    /**
     * Test is left equal to the right on variable-value level
     * @param {T} left Object 1
     * @param {T} right Object 2
     * @param {string[]} affected, list of affected keys to compare
     * @return {boolean}
     * @example
     *  proxyEqual({a:1,b:2},{a:1,c:2},['.a']) => true
     *  proxyShallow({a:1,b:2},{a:1,c:2},['.a']) => false
     */
    export function proxyEqual<T>(left: T, right: T, affected: string[]): boolean;

    /**
     * Test is left `shallow` equal to the right on object-instance level
     * @param {T} left Object 1
     * @param {T} right Object 2
     * @param {string[]} affected, list of affected keys to compare
     * @return {boolean}
     * @example
     * const A = {}
     * proxyEqual({a:A,b:2},{a:A,c:2},['.a']) => true
     * proxyShallow({a:A,b:2},{a:A,c:2},['.a']) => true
     */
    export function proxyShallow<T>(left: T, right: T, affected: string[]): boolean;

    /**
     * de-proxifies object
     * @param {T} source
     * @return {T}
     */
    export function deproxify<T>(source: T): T;
}