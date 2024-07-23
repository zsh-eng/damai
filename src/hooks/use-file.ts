import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type File = {
  id: number;
  filename: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
};

export function useFiles() {
  return useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/files`);

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      if (!data) {
        throw new Error("Failed to fetch files");
      }

      return data as File[];
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      content,
      filename,
    }: {
      id: number;
      content?: string;
      filename?: string;
    }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, filename }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update file");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to update file");
      }

      return;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files"],
      });
    },
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ filename }: { filename: string }) => {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error("Failed to create file");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to create file");
      }

      return data.file as File;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files"],
      });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to delete file");
      }

      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files"],
      });
    },
  });
}

export function useSearchFile(searchString: string) {
  return useQuery({
    queryKey: ["files", "search", searchString],
    queryFn: async () => {
      if (!searchString) {
        return [];
      }

      const searchParams = new URLSearchParams();
      searchParams.set("q", searchString);

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/search?${searchParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to fetch search");
      }

      return data.files as {
        id: number;
        filename: string;
        rank: number;
        headline: string;
      }[];
    },
  });
}
