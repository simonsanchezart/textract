import { Dispatch, SetStateAction } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { buttonVariants } from "./ui/button";
import { VariantProps } from "class-variance-authority";

type PopupProps = {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    title?: string;
    description?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    confirmStyling?: string;
    onConfirm?: () => void;
};

function PopupConfirm({
    open,
    setOpen,
    title = "Title",
    description = "Description",
    cancelLabel = "Cancel",
    confirmLabel = "Confirm",
    confirmStyling = "bg-red",
    onConfirm,
}: PopupProps) {
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setOpen(false);
                        }}
                    >
                        {cancelLabel}
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={async () => {
                            await onConfirm?.();
                            setOpen(false);
                        }}
                        className={confirmStyling}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
export default PopupConfirm;
