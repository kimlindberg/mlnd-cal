<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<AvatarPrimitive.RootProps> & { children?: Snippet } = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	data-slot="avatar"
	class={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Root>
