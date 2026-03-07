import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Attachment {
  blobId: string;       // e.g., "/volute-attachment-123456.png"
  blobUrl: string;      // e.g., "https://blob.vercel-storage.com/..."
  mediaType: string;    // e.g., "image/png", "image/jpeg"
  previewUrl: string;   // Local object URL for preview
  name?: string;        // Original filename
}

interface AttachmentsState {
  attachments: Attachment[];
}

const initialState: AttachmentsState = {
  attachments: [],
};

const attachmentsSlice = createSlice({
  name: "attachments",
  initialState,
  reducers: {
    addAttachment: (state, action: PayloadAction<Attachment>) => {
      state.attachments.push(action.payload);
    },
    removeAttachment: (state, action: PayloadAction<string>) => {
      // Remove by blobId
      state.attachments = state.attachments.filter(
        (att) => att.blobId !== action.payload
      );
    },
    clearAttachments: (state) => {
      state.attachments = [];
    },
  },
});

export const { addAttachment, removeAttachment, clearAttachments } =
  attachmentsSlice.actions;

export default attachmentsSlice.reducer;