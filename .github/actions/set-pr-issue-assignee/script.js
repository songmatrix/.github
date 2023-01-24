module.exports = async ({ github, core, owner, repo, prNumber }) => {
  const query = await github.graphql(
    `query ($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          closingIssuesReferences(first: 5) {
            totalCount
            nodes {
              id
              number
              title
            }
          }
          commits(last: 1) {
            nodes {
              commit {
                author {
                  user {
                    id
                    name
                    login
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { owner, repo, prNumber }
  );

  console.log(JSON.stringify({ query }, null, 2));

  const issue =
    query.repository.pullRequest.closingIssuesReferences?.nodes?.[0];
  const authors = query.repository.pullRequest.commits.nodes?.map(
    (node) => node.commit.author.user
  );
  if (!issue || !authors?.length) {
    return;
  }

  const issueDisplay = `${owner}/${repo}#${issue.number}`;
  await core.summary
    .addRaw(`Adding the following authors to issue ${issueDisplay}`, true)
    .addList(authors.map((author) => `${author.name} (\`${author.login}\`)`))
    .write();

  const mutation = await github.graphql(
    `mutation ($assigneeIds: [ID!]!, $assignableId: ID!) {
      addAssigneesToAssignable(
        input: { assigneeIds: $assigneeIds, assignableId: $assignableId }
      ) {
        clientMutationId
      }
    }`,
    {
      assignableId: closingIssuesReferences[0].id,
      assigneeIds: authors.map((author) => author.id),
    }
  );

  console.log(JSON.stringify({ mutation }, null, 2));
};
