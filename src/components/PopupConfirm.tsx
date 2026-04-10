//research: dispatch
import { Dispatch, SetStateAction } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"outline"}> {cancelLabel}</Button>
                    </DialogClose>

                    <Button
                        onClick={async () => {
                            await onConfirm?.();
                            setOpen(false);
                        }}
                        className={confirmStyling}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
export default PopupConfirm;
