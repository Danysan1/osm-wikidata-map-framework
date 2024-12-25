"use client";

import {
    FC,
    PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useState
} from "react";
import { Snackbar } from "../components/Snackbar/Snackbar";

interface SnackbarState {
    showSnackbar: (message: string, color?: string, timeout?: number) => void;
}

const SnackbarContext = createContext<SnackbarState>({
    showSnackbar: () => {
        /* placeholder */
    },
});

export const useSnackbarContext = () => useContext(SnackbarContext);

export const SnackbarContextProvider: FC<PropsWithChildren> = ({ children }) => {
    const [text, setText] = useState<string>(),
        [color, setColor] = useState<string>("green"),
        [timeoutObj, setTimeoutObj] = useState<NodeJS.Timeout>();
    const showSnackbar = useCallback((message: string, color = "lightcoral", timeout = 3000) => {
        console.debug(
            "showSnackbar", { message, color, timeout }
        );
        setColor(color);
        setText(message);
        setTimeoutObj(() => {
            if (timeoutObj)
                clearTimeout(timeoutObj);
            return setTimeout(() => setText(undefined), timeout);
        });
    }, [timeoutObj]);

    return (
        <SnackbarContext.Provider value={{ showSnackbar }} >
            {children}
            <Snackbar show={!!text} message={text ?? ""} color={color} />
        </SnackbarContext.Provider>
    );
};
