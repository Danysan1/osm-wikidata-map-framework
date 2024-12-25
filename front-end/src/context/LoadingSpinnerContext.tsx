"use client";

import {
    Dispatch,
    FC,
    PropsWithChildren,
    SetStateAction,
    createContext,
    useCallback,
    useContext,
    useState
} from "react";
import { LoadingSpinner } from "../components/LoadingSpinner/LoadingSpinner";

interface LoadingSpinnerState {
    showLoadingSpinner: Dispatch<SetStateAction<boolean>>;
}

const LoadingSpinnerContext = createContext<LoadingSpinnerState>({
    showLoadingSpinner: () => {
        /* placeholder */
    },
});

export const useLoadingSpinnerContext = () => useContext(LoadingSpinnerContext);

export const LoadingSpinnerContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const showLoadingSpinner = useCallback((show: SetStateAction<boolean>) => {
        console.debug(
            "showLoadingSpinner", { show }
        );
        setLoading(show);
    }, []);

    return (
        <LoadingSpinnerContext.Provider value={{ showLoadingSpinner }} >
            {children}
            {loading && <LoadingSpinner />}
        </LoadingSpinnerContext.Provider>
    );
};
